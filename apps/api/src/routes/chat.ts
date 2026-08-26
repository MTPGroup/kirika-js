import { zValidator } from '@hono/zod-validator'
import { skipInferdiDispose } from '@inferdi/hono'
import {
  CharacterId,
  CharacterRevisionId,
} from '@kirika-js/core/domain/character'
import {
  Conversation,
  ConversationId,
  ConversationMessageId,
  ConversationParticipant,
  ConversationParticipantId,
  MessageContent,
} from '@kirika-js/core/domain/conversation'
import { UserId } from '@kirika-js/core/domain/shared'
import { eq, inArray } from 'drizzle-orm'
import type { Hono } from 'hono'
import { streamSSE } from 'hono/streaming'
import { describeRoute } from 'hono-openapi'
import { problemDetailsResponseJsonSchema } from 'hono-problem-details/openapi-json-schema'
import { z } from 'zod'
import type { AppEnv } from '../container'
import { conversationToJson, messageToJson } from '../conversation/serialize'
import { characterRevisions } from '../db/character-schema'
import { idempotency } from '../http/idempotency-middleware'
import {
  idParamSchema,
  jsonRequest,
  listQuerySchema,
  sessionSecurity,
} from '../http/openapi'
import { problems, validationProblemHook } from '../http/problems'
import {
  registerGeneration,
  stopGeneration,
  unregisterGeneration,
} from '../lib/generation-registry'

const createConversationSchema = z.object({
  characterRevisionIds: z.array(z.uuid()).min(1),
  mode: z.enum(['direct', 'group']).optional(),
  title: z.string().trim().min(1).max(200).optional(),
  turnPolicy: z.enum(['manual', 'round_robin']).optional(),
})

const sendMessageSchema = z.object({
  content: z.string().trim().min(1),
  model: z.string().trim().min(1).optional(),
  speakerParticipantId: z.uuid().optional(),
})

const regenerateParamSchema = z.object({
  id: z.uuid(),
  messageId: z.uuid(),
})

const regenerateSchema = z.object({
  model: z.string().trim().min(1).optional(),
  speakerParticipantId: z.uuid().optional(),
})

const patchConversationSchema = z.object({
  title: z.string().trim().min(1).max(200).nullable().optional(),
  mode: z.enum(['direct', 'group']).optional(),
  turnPolicy: z.enum(['manual', 'round_robin']).optional(),
})

const addParticipantSchema = z.object({
  characterRevisionId: z.uuid(),
  displayName: z.string().trim().min(1).optional(),
})

const renameParticipantSchema = z.object({
  displayName: z.string().trim().min(1),
})

const createGreetingSchema = z.object({
  characterParticipantId: z.uuid(),
  content: z.string().trim().min(1),
})

const selectBranchParamSchema = z.object({
  id: z.uuid(),
  messageId: z.uuid(),
})

export function mountChatRoutes(app: Hono<AppEnv>): void {
  app.get(
    '/conversations',
    describeRoute({
      tags: ['Conversations'],
      summary: '会话列表',
      security: sessionSecurity,
      responses: {
        200: { description: '会话分页列表。' },
        401: problemDetailsResponseJsonSchema(401, '未登录'),
      },
    }),
    zValidator('query', listQuerySchema, validationProblemHook()),
    async (c) => {
      const session = await c.var.di.get('auth').api.getSession({
        headers: c.req.raw.headers,
      })
      if (!session) {
        throw problems.create('UNAUTHORIZED', { detail: '未登录' })
      }

      const { limit, offset } = c.req.valid('query')
      const result = await c.var.di
        .get('conversationRepository')
        .listByOwner(session.user.id, limit, offset)
      return c.json(result)
    },
  )

  app.get(
    '/conversations/:id',
    describeRoute({
      tags: ['Conversations'],
      summary: '会话详情',
      security: sessionSecurity,
      responses: {
        200: { description: '会话详情。' },
        401: problemDetailsResponseJsonSchema(401, '未登录'),
        403: problemDetailsResponseJsonSchema(403, '无权访问该会话'),
        404: problemDetailsResponseJsonSchema(404, '会话不存在'),
      },
    }),
    zValidator('param', idParamSchema, validationProblemHook()),
    async (c) => {
      const session = await c.var.di.get('auth').api.getSession({
        headers: c.req.raw.headers,
      })
      if (!session) {
        throw problems.create('UNAUTHORIZED', { detail: '未登录' })
      }

      const { id } = c.req.valid('param')
      const conversation = await c.var.di
        .get('conversationRepository')
        .findById(new ConversationId(id))
      if (!conversation) {
        throw problems.create('NOT_FOUND', { detail: '会话不存在' })
      }
      if (conversation.ownerId.value !== session.user.id) {
        throw problems.create('FORBIDDEN', { detail: '无权访问该会话' })
      }

      return c.json(conversationToJson(conversation))
    },
  )

  app.get(
    '/conversations/:id/messages',
    describeRoute({
      tags: ['Conversations'],
      summary: '会话消息历史（当前活跃分支）',
      security: sessionSecurity,
      responses: {
        200: { description: '消息列表。' },
        401: problemDetailsResponseJsonSchema(401, '未登录'),
        403: problemDetailsResponseJsonSchema(403, '无权访问该会话'),
        404: problemDetailsResponseJsonSchema(404, '会话不存在'),
      },
    }),
    zValidator('param', idParamSchema, validationProblemHook()),
    async (c) => {
      const session = await c.var.di.get('auth').api.getSession({
        headers: c.req.raw.headers,
      })
      if (!session) {
        throw problems.create('UNAUTHORIZED', { detail: '未登录' })
      }

      const { id } = c.req.valid('param')
      const conversation = await c.var.di
        .get('conversationRepository')
        .findById(new ConversationId(id))
      if (!conversation) {
        throw problems.create('NOT_FOUND', { detail: '会话不存在' })
      }
      if (conversation.ownerId.value !== session.user.id) {
        throw problems.create('FORBIDDEN', { detail: '无权访问该会话' })
      }

      const messages = conversation.activeLeafMessageId
        ? await c.var.di
            .get('conversationMessageRepository')
            .findPathToRoot(conversation.id, conversation.activeLeafMessageId)
        : []
      return c.json({ messages: messages.map(messageToJson) })
    },
  )

  app.delete(
    '/conversations/:id',
    describeRoute({
      tags: ['Conversations'],
      summary: '删除会话',
      security: sessionSecurity,
      responses: {
        204: { description: '会话已删除。' },
        401: problemDetailsResponseJsonSchema(401, '未登录'),
        403: problemDetailsResponseJsonSchema(403, '无权删除该会话'),
        404: problemDetailsResponseJsonSchema(404, '会话不存在'),
      },
    }),
    zValidator('param', idParamSchema, validationProblemHook()),
    async (c) => {
      const session = await c.var.di.get('auth').api.getSession({
        headers: c.req.raw.headers,
      })
      if (!session) {
        throw problems.create('UNAUTHORIZED', { detail: '未登录' })
      }

      const { id } = c.req.valid('param')
      const conversation = await c.var.di
        .get('conversationRepository')
        .findById(new ConversationId(id))
      if (!conversation) {
        throw problems.create('NOT_FOUND', { detail: '会话不存在' })
      }
      if (conversation.ownerId.value !== session.user.id) {
        throw problems.create('FORBIDDEN', { detail: '无权删除该会话' })
      }

      await c.var.di.get('conversationRepository').delete(conversation.id)
      return c.body(null, 204)
    },
  )
  app.patch(
    '/conversations/:id',
    describeRoute({
      tags: ['Conversations'],
      summary: '更新会话元数据（标题、模式、发言策略）',
      security: sessionSecurity,
      requestBody: jsonRequest(patchConversationSchema),
      responses: {
        200: { description: '会话已更新。' },
        401: problemDetailsResponseJsonSchema(401, '未登录'),
        403: problemDetailsResponseJsonSchema(403, '无权访问该会话'),
        404: problemDetailsResponseJsonSchema(404, '会话不存在'),
        422: problemDetailsResponseJsonSchema(422, '无法更新会话'),
      },
    }),
    zValidator('param', idParamSchema, validationProblemHook()),
    zValidator('json', patchConversationSchema, validationProblemHook()),
    async (c) => {
      const session = await c.var.di.get('auth').api.getSession({
        headers: c.req.raw.headers,
      })
      if (!session) {
        throw problems.create('UNAUTHORIZED', { detail: '未登录' })
      }

      const { id } = c.req.valid('param')
      const conversation = await c.var.di
        .get('conversationRepository')
        .findById(new ConversationId(id))
      if (!conversation) {
        throw problems.create('NOT_FOUND', { detail: '会话不存在' })
      }
      if (conversation.ownerId.value !== session.user.id) {
        throw problems.create('FORBIDDEN', { detail: '无权访问该会话' })
      }

      const body = c.req.valid('json')
      try {
        if (body.title !== undefined) conversation.rename(body.title)
        if (body.mode === 'group' && conversation.mode === 'direct') {
          conversation.convertToGroup(
            body.turnPolicy ?? conversation.turnPolicy,
          )
        } else if (body.mode === 'direct' && conversation.mode === 'group') {
          throw new Error('群聊不能转换回一对一会话')
        }
        if (body.turnPolicy !== undefined) {
          conversation.changeTurnPolicy(body.turnPolicy)
        }
      } catch (error) {
        throw problems.create('INVALID_STATE', {
          detail: error instanceof Error ? error.message : String(error),
        })
      }

      await c.var.di.get('conversationRepository').save(conversation)
      return c.json(conversationToJson(conversation))
    },
  )

  app.post(
    '/conversations/:id/participants',
    describeRoute({
      tags: ['Conversations'],
      summary: '向群聊添加角色参与者',
      security: sessionSecurity,
      requestBody: jsonRequest(addParticipantSchema),
      responses: {
        200: { description: '参与者已添加。' },
        401: problemDetailsResponseJsonSchema(401, '未登录'),
        403: problemDetailsResponseJsonSchema(403, '无权访问该会话'),
        404: problemDetailsResponseJsonSchema(404, '会话或角色版本不存在'),
        422: problemDetailsResponseJsonSchema(422, '无法添加参与者'),
      },
    }),
    zValidator('param', idParamSchema, validationProblemHook()),
    zValidator('json', addParticipantSchema, validationProblemHook()),
    async (c) => {
      const session = await c.var.di.get('auth').api.getSession({
        headers: c.req.raw.headers,
      })
      if (!session) {
        throw problems.create('UNAUTHORIZED', { detail: '未登录' })
      }

      const { id } = c.req.valid('param')
      const conversation = await c.var.di
        .get('conversationRepository')
        .findById(new ConversationId(id))
      if (!conversation) {
        throw problems.create('NOT_FOUND', { detail: '会话不存在' })
      }
      if (conversation.ownerId.value !== session.user.id) {
        throw problems.create('FORBIDDEN', { detail: '无权访问该会话' })
      }

      const { characterRevisionId, displayName } = c.req.valid('json')
      const [revision] = await c.var.di
        .get('db')
        .select({
          id: characterRevisions.id,
          characterId: characterRevisions.characterId,
          name: characterRevisions.name,
        })
        .from(characterRevisions)
        .where(eq(characterRevisions.id, characterRevisionId))
        .limit(1)
      if (!revision) {
        throw problems.create('NOT_FOUND', { detail: '角色版本不存在' })
      }

      try {
        if (conversation.mode === 'direct') {
          conversation.convertToGroup(conversation.turnPolicy)
        }
        conversation.addParticipant(
          ConversationParticipant.createCharacter({
            characterId: new CharacterId(revision.characterId),
            characterRevisionId: new CharacterRevisionId(revision.id),
            displayName: displayName ?? revision.name,
          }),
        )
      } catch (error) {
        throw problems.create('INVALID_STATE', {
          detail: error instanceof Error ? error.message : String(error),
        })
      }

      await c.var.di.get('conversationRepository').save(conversation)
      return c.json(conversationToJson(conversation))
    },
  )

  app.delete(
    '/conversations/:id/participants/:participantId',
    describeRoute({
      tags: ['Conversations'],
      summary: '移除会话参与者',
      security: sessionSecurity,
      responses: {
        200: { description: '参与者已移除。' },
        401: problemDetailsResponseJsonSchema(401, '未登录'),
        403: problemDetailsResponseJsonSchema(403, '无权访问该会话'),
        404: problemDetailsResponseJsonSchema(404, '会话或参与者不存在'),
        422: problemDetailsResponseJsonSchema(422, '无法移除参与者'),
      },
    }),
    zValidator(
      'param',
      z.object({ id: z.uuid(), participantId: z.uuid() }),
      validationProblemHook(),
    ),
    async (c) => {
      const session = await c.var.di.get('auth').api.getSession({
        headers: c.req.raw.headers,
      })
      if (!session) {
        throw problems.create('UNAUTHORIZED', { detail: '未登录' })
      }

      const { id, participantId } = c.req.valid('param')
      const conversation = await c.var.di
        .get('conversationRepository')
        .findById(new ConversationId(id))
      if (!conversation) {
        throw problems.create('NOT_FOUND', { detail: '会话不存在' })
      }
      if (conversation.ownerId.value !== session.user.id) {
        throw problems.create('FORBIDDEN', { detail: '无权访问该会话' })
      }
      if (
        !conversation.findParticipant(
          new ConversationParticipantId(participantId),
        )
      ) {
        throw problems.create('NOT_FOUND', { detail: '参与者不存在' })
      }

      try {
        conversation.removeParticipant(
          new ConversationParticipantId(participantId),
        )
      } catch (error) {
        throw problems.create('INVALID_STATE', {
          detail: error instanceof Error ? error.message : String(error),
        })
      }

      await c.var.di.get('conversationRepository').save(conversation)
      return c.json(conversationToJson(conversation))
    },
  )

  app.patch(
    '/conversations/:id/participants/:participantId',
    describeRoute({
      tags: ['Conversations'],
      summary: '重命名会话参与者',
      security: sessionSecurity,
      requestBody: jsonRequest(renameParticipantSchema),
      responses: {
        200: { description: '参与者已重命名。' },
        401: problemDetailsResponseJsonSchema(401, '未登录'),
        403: problemDetailsResponseJsonSchema(403, '无权访问该会话'),
        404: problemDetailsResponseJsonSchema(404, '会话或参与者不存在'),
        422: problemDetailsResponseJsonSchema(422, '无法重命名参与者'),
      },
    }),
    zValidator(
      'param',
      z.object({ id: z.uuid(), participantId: z.uuid() }),
      validationProblemHook(),
    ),
    zValidator('json', renameParticipantSchema, validationProblemHook()),
    async (c) => {
      const session = await c.var.di.get('auth').api.getSession({
        headers: c.req.raw.headers,
      })
      if (!session) {
        throw problems.create('UNAUTHORIZED', { detail: '未登录' })
      }

      const { id, participantId } = c.req.valid('param')
      const conversation = await c.var.di
        .get('conversationRepository')
        .findById(new ConversationId(id))
      if (!conversation) {
        throw problems.create('NOT_FOUND', { detail: '会话不存在' })
      }
      if (conversation.ownerId.value !== session.user.id) {
        throw problems.create('FORBIDDEN', { detail: '无权访问该会话' })
      }
      if (
        !conversation.findParticipant(
          new ConversationParticipantId(participantId),
        )
      ) {
        throw problems.create('NOT_FOUND', { detail: '参与者不存在' })
      }

      try {
        conversation.renameParticipant(
          new ConversationParticipantId(participantId),
          c.req.valid('json').displayName,
        )
      } catch (error) {
        throw problems.create('INVALID_STATE', {
          detail: error instanceof Error ? error.message : String(error),
        })
      }

      await c.var.di.get('conversationRepository').save(conversation)
      return c.json(conversationToJson(conversation))
    },
  )

  app.post(
    '/conversations/:id/greeting',
    describeRoute({
      tags: ['Conversations'],
      summary: '创建角色问候消息',
      security: sessionSecurity,
      requestBody: jsonRequest(createGreetingSchema),
      responses: {
        201: { description: '问候消息已创建。' },
        401: problemDetailsResponseJsonSchema(401, '未登录'),
        403: problemDetailsResponseJsonSchema(403, '无权访问该会话'),
        404: problemDetailsResponseJsonSchema(404, '会话或参与者不存在'),
        422: problemDetailsResponseJsonSchema(422, '无法创建问候消息'),
      },
    }),
    zValidator('param', idParamSchema, validationProblemHook()),
    zValidator('json', createGreetingSchema, validationProblemHook()),
    async (c) => {
      const session = await c.var.di.get('auth').api.getSession({
        headers: c.req.raw.headers,
      })
      if (!session) {
        throw problems.create('UNAUTHORIZED', { detail: '未登录' })
      }

      const { id } = c.req.valid('param')
      const conversation = await c.var.di
        .get('conversationRepository')
        .findById(new ConversationId(id))
      if (!conversation) {
        throw problems.create('NOT_FOUND', { detail: '会话不存在' })
      }
      if (conversation.ownerId.value !== session.user.id) {
        throw problems.create('FORBIDDEN', { detail: '无权访问该会话' })
      }

      const { characterParticipantId, content } = c.req.valid('json')
      const participant = conversation.findParticipant(
        new ConversationParticipantId(characterParticipantId),
      )
      if (!participant || participant.type !== 'character') {
        throw problems.create('NOT_FOUND', { detail: '角色参与者不存在' })
      }

      const parent = conversation.activeLeafMessageId
        ? await c.var.di
            .get('conversationMessageRepository')
            .findById(conversation.activeLeafMessageId)
        : null

      try {
        const greeting = conversation.createGreetingMessage(
          participant.id,
          MessageContent.fromText(content),
          parent,
        )
        await c.var.di.get('conversationMessageRepository').save(greeting)
        await c.var.di.get('conversationRepository').save(conversation)
        return c.json(messageToJson(greeting), 201)
      } catch (error) {
        throw problems.create('INVALID_STATE', {
          detail: error instanceof Error ? error.message : String(error),
        })
      }
    },
  )

  app.post(
    '/conversations/:id/branches/:messageId/select',
    describeRoute({
      tags: ['Conversations'],
      summary: '选择消息分支',
      security: sessionSecurity,
      responses: {
        200: { description: '分支已切换。' },
        401: problemDetailsResponseJsonSchema(401, '未登录'),
        403: problemDetailsResponseJsonSchema(403, '无权访问该会话'),
        404: problemDetailsResponseJsonSchema(404, '会话或消息不存在'),
        422: problemDetailsResponseJsonSchema(422, '无法切换分支'),
      },
    }),
    zValidator('param', selectBranchParamSchema, validationProblemHook()),
    async (c) => {
      const session = await c.var.di.get('auth').api.getSession({
        headers: c.req.raw.headers,
      })
      if (!session) {
        throw problems.create('UNAUTHORIZED', { detail: '未登录' })
      }

      const { id, messageId } = c.req.valid('param')
      const conversation = await c.var.di
        .get('conversationRepository')
        .findById(new ConversationId(id))
      if (!conversation) {
        throw problems.create('NOT_FOUND', { detail: '会话不存在' })
      }
      if (conversation.ownerId.value !== session.user.id) {
        throw problems.create('FORBIDDEN', { detail: '无权访问该会话' })
      }

      const messageRepository = c.var.di.get('conversationMessageRepository')
      const message = await messageRepository.findById(
        new ConversationMessageId(messageId),
      )
      if (!message?.conversationId.equals(conversation.id)) {
        throw problems.create('NOT_FOUND', { detail: '消息不存在' })
      }

      try {
        conversation.selectMessageBranch(
          message,
          await messageRepository.hasChildren(message.id),
        )
      } catch (error) {
        throw problems.create('INVALID_STATE', {
          detail: error instanceof Error ? error.message : String(error),
        })
      }

      await c.var.di.get('conversationRepository').save(conversation)
      return c.json(conversationToJson(conversation))
    },
  )

  app.post(
    '/conversations',
    describeRoute({
      tags: ['Conversations'],
      summary: '创建会话（一对一或群聊）',
      security: sessionSecurity,
      requestBody: jsonRequest(createConversationSchema),
      responses: {
        201: { description: '会话创建成功。' },
        401: problemDetailsResponseJsonSchema(401, '未登录'),
        404: problemDetailsResponseJsonSchema(404, '角色版本不存在'),
      },
    }),
    zValidator('json', createConversationSchema, validationProblemHook()),
    async (c) => {
      const session = await c.var.di.get('auth').api.getSession({
        headers: c.req.raw.headers,
      })
      if (!session) {
        throw problems.create('UNAUTHORIZED', { detail: '未登录' })
      }

      const body = c.req.valid('json')
      const revisions = await c.var.di
        .get('db')
        .select({
          id: characterRevisions.id,
          characterId: characterRevisions.characterId,
          name: characterRevisions.name,
        })
        .from(characterRevisions)
        .where(inArray(characterRevisions.id, body.characterRevisionIds))

      if (revisions.length !== body.characterRevisionIds.length) {
        throw problems.create('NOT_FOUND', { detail: '角色版本不存在' })
      }

      const owner = ConversationParticipant.createHuman({
        userId: new UserId(session.user.id),
        displayName: session.user.name,
        role: 'owner',
      })
      const characters = revisions.map((revision) =>
        ConversationParticipant.createCharacter({
          characterId: new CharacterId(revision.characterId),
          characterRevisionId: new CharacterRevisionId(revision.id),
          displayName: revision.name,
        }),
      )

      const mode = body.mode ?? (characters.length === 1 ? 'direct' : 'group')
      const conversation = Conversation.create({
        ownerId: new UserId(session.user.id),
        mode,
        participants: [owner, ...characters],
        title: body.title ?? null,
        turnPolicy: body.turnPolicy ?? 'manual',
      })

      await c.var.di.get('conversationRepository').save(conversation)
      return c.json({ id: conversation.id.value }, 201)
    },
  )

  app.post(
    '/conversations/:id/messages',
    describeRoute({
      tags: ['Conversations'],
      summary: '发送消息并流式生成角色回复',
      security: sessionSecurity,
      requestBody: jsonRequest(sendMessageSchema),
      responses: {
        200: {
          description: 'SSE 生成事件流。',
          content: {
            'text/event-stream': {
              schema: { type: 'string' },
            },
          },
        },
        401: problemDetailsResponseJsonSchema(401, '未登录'),
        403: problemDetailsResponseJsonSchema(403, '无权访问该会话'),
        404: problemDetailsResponseJsonSchema(404, '会话不存在'),
        429: problemDetailsResponseJsonSchema(429, '请求过于频繁'),
      },
    }),
    zValidator('param', idParamSchema, validationProblemHook()),
    zValidator('json', sendMessageSchema, validationProblemHook()),
    idempotency({
      resourceId: (c) => `conversation:${c.req.param('id')}:messages`,
    }),
    async (c) => {
      const session = await c.var.di.get('auth').api.getSession({
        headers: c.req.raw.headers,
      })
      if (!session) {
        throw problems.create('UNAUTHORIZED', { detail: '未登录' })
      }

      const { id } = c.req.valid('param')
      const conversation = await c.var.di
        .get('conversationRepository')
        .findById(new ConversationId(id))
      if (!conversation) {
        throw problems.create('NOT_FOUND', { detail: '会话不存在' })
      }

      const owner = conversation.participants.find((p) => p.role === 'owner')
      if (!owner || owner.userId?.value !== session.user.id) {
        throw problems.create('FORBIDDEN', { detail: '无权访问该会话' })
      }

      const history = conversation.activeLeafMessageId
        ? await c.var.di
            .get('conversationMessageRepository')
            .findPathToRoot(conversation.id, conversation.activeLeafMessageId)
        : []
      const body = c.req.valid('json')

      skipInferdiDispose(c)
      const scope = c.var.di
      return streamSSE(c, async (stream) => {
        const startedAt = performance.now()
        const controller = new AbortController()
        registerGeneration(conversation.id.value, controller)
        stream.onAbort(() => controller.abort())

        let eventCount = 0
        try {
          for await (const event of c.var.di.get('chatService').sendMessage({
            conversation,
            history,
            humanParticipantId: owner.id,
            content: MessageContent.fromText(body.content),
            model: body.model,
            signal: controller.signal,
            speakerParticipantId: body.speakerParticipantId
              ? new ConversationParticipantId(body.speakerParticipantId)
              : undefined,
          })) {
            await stream.writeSSE({
              event: event.type,
              data: JSON.stringify(event),
            })
            eventCount += 1
          }
          c.var.logger
            .withMetadata({
              conversationId: conversation.id.value,
              eventCount,
              durationMs: Math.round(performance.now() - startedAt),
            })
            .info('stream completed')
        } catch (error) {
          c.var.logger
            .withError(error)
            .withMetadata({ conversationId: conversation.id.value })
            .error('stream failed')
          await stream.writeSSE({
            event: 'error',
            data: JSON.stringify({
              type: 'error',
              reason: error instanceof Error ? error.message : String(error),
            }),
          })
        } finally {
          unregisterGeneration(conversation.id.value)
          await scope.dispose()
        }
      })
    },
  )

  app.post(
    '/conversations/:id/messages/:messageId/regenerate',
    describeRoute({
      tags: ['Conversations'],
      summary: '重新生成指定消息',
      security: sessionSecurity,
      requestBody: jsonRequest(regenerateSchema),
      responses: {
        200: { description: 'SSE 生成事件流。' },
        401: problemDetailsResponseJsonSchema(401, '未登录'),
        403: problemDetailsResponseJsonSchema(403, '无权访问该会话'),
        404: problemDetailsResponseJsonSchema(404, '消息不存在'),
      },
    }),
    zValidator('param', regenerateParamSchema, validationProblemHook()),
    zValidator('json', regenerateSchema, validationProblemHook()),
    async (c) => {
      const session = await c.var.di.get('auth').api.getSession({
        headers: c.req.raw.headers,
      })
      if (!session) {
        throw problems.create('UNAUTHORIZED', { detail: '未登录' })
      }

      const { id, messageId } = c.req.valid('param')
      const conversation = await c.var.di
        .get('conversationRepository')
        .findById(new ConversationId(id))
      if (!conversation) {
        throw problems.create('NOT_FOUND', { detail: '会话不存在' })
      }
      if (conversation.ownerId.value !== session.user.id) {
        throw problems.create('FORBIDDEN', { detail: '无权访问该会话' })
      }

      const message = await c.var.di
        .get('conversationMessageRepository')
        .findById(new ConversationMessageId(messageId))
      if (!message?.conversationId.equals(conversation.id)) {
        throw problems.create('NOT_FOUND', { detail: '消息不存在' })
      }

      const parentMessage = message.parentMessageId
        ? await c.var.di
            .get('conversationMessageRepository')
            .findById(message.parentMessageId)
        : null
      const history = parentMessage
        ? await c.var.di
            .get('conversationMessageRepository')
            .findPathToRoot(conversation.id, parentMessage.id)
        : []
      const body = c.req.valid('json')

      skipInferdiDispose(c)
      const scope = c.var.di
      return streamSSE(c, async (stream) => {
        const controller = new AbortController()
        registerGeneration(conversation.id.value, controller)
        stream.onAbort(() => controller.abort())

        try {
          for await (const event of c.var.di.get('chatService').generate({
            conversation,
            history,
            model: body.model,
            signal: controller.signal,
            speakerParticipantId: body.speakerParticipantId
              ? new ConversationParticipantId(body.speakerParticipantId)
              : undefined,
          })) {
            await stream.writeSSE({
              event: event.type,
              data: JSON.stringify(event),
            })
          }
        } catch (error) {
          await stream.writeSSE({
            event: 'error',
            data: JSON.stringify({
              type: 'error',
              reason: error instanceof Error ? error.message : String(error),
            }),
          })
        } finally {
          unregisterGeneration(conversation.id.value)
          await scope.dispose()
        }
      })
    },
  )

  app.post(
    '/conversations/:id/stop',
    describeRoute({
      tags: ['Conversations'],
      summary: '停止正在进行的生成',
      security: sessionSecurity,
      responses: {
        200: { description: '停止结果。' },
        401: problemDetailsResponseJsonSchema(401, '未登录'),
        403: problemDetailsResponseJsonSchema(403, '无权访问该会话'),
        404: problemDetailsResponseJsonSchema(404, '会话不存在'),
      },
    }),
    zValidator('param', idParamSchema, validationProblemHook()),
    async (c) => {
      const session = await c.var.di.get('auth').api.getSession({
        headers: c.req.raw.headers,
      })
      if (!session) {
        throw problems.create('UNAUTHORIZED', { detail: '未登录' })
      }

      const { id } = c.req.valid('param')
      const conversation = await c.var.di
        .get('conversationRepository')
        .findById(new ConversationId(id))
      if (!conversation) {
        throw problems.create('NOT_FOUND', { detail: '会话不存在' })
      }
      if (conversation.ownerId.value !== session.user.id) {
        throw problems.create('FORBIDDEN', { detail: '无权访问该会话' })
      }

      const stopped = stopGeneration(conversation.id.value)
      return c.json({ stopped })
    },
  )

  app.post(
    '/conversations/:id/archive',
    describeRoute({
      tags: ['Conversations'],
      summary: '归档会话',
      security: sessionSecurity,
      responses: {
        200: { description: '会话已归档。' },
        401: problemDetailsResponseJsonSchema(401, '未登录'),
        403: problemDetailsResponseJsonSchema(403, '无权访问该会话'),
        404: problemDetailsResponseJsonSchema(404, '会话不存在'),
      },
    }),
    zValidator('param', idParamSchema, validationProblemHook()),
    async (c) => {
      const session = await c.var.di.get('auth').api.getSession({
        headers: c.req.raw.headers,
      })
      if (!session) {
        throw problems.create('UNAUTHORIZED', { detail: '未登录' })
      }

      const { id } = c.req.valid('param')
      const conversation = await c.var.di
        .get('conversationRepository')
        .findById(new ConversationId(id))
      if (!conversation) {
        throw problems.create('NOT_FOUND', { detail: '会话不存在' })
      }
      if (conversation.ownerId.value !== session.user.id) {
        throw problems.create('FORBIDDEN', { detail: '无权访问该会话' })
      }

      conversation.archive()
      await c.var.di.get('conversationRepository').save(conversation)
      return c.json(conversationToJson(conversation))
    },
  )

  app.post(
    '/conversations/:id/restore',
    describeRoute({
      tags: ['Conversations'],
      summary: '恢复归档会话',
      security: sessionSecurity,
      responses: {
        200: { description: '会话已恢复。' },
        401: problemDetailsResponseJsonSchema(401, '未登录'),
        403: problemDetailsResponseJsonSchema(403, '无权访问该会话'),
        404: problemDetailsResponseJsonSchema(404, '会话不存在'),
      },
    }),
    zValidator('param', idParamSchema, validationProblemHook()),
    async (c) => {
      const session = await c.var.di.get('auth').api.getSession({
        headers: c.req.raw.headers,
      })
      if (!session) {
        throw problems.create('UNAUTHORIZED', { detail: '未登录' })
      }

      const { id } = c.req.valid('param')
      const conversation = await c.var.di
        .get('conversationRepository')
        .findById(new ConversationId(id))
      if (!conversation) {
        throw problems.create('NOT_FOUND', { detail: '会话不存在' })
      }
      if (conversation.ownerId.value !== session.user.id) {
        throw problems.create('FORBIDDEN', { detail: '无权访问该会话' })
      }

      conversation.restore()
      await c.var.di.get('conversationRepository').save(conversation)
      return c.json(conversationToJson(conversation))
    },
  )
}
