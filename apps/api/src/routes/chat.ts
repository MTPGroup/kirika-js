import { zValidator } from '@hono/zod-validator'
import {
  CharacterId,
  CharacterRevisionId,
} from '@kirika-js/core/domain/character'
import {
  Conversation,
  ConversationId,
  type ConversationMessageRepositoryPort,
  ConversationParticipant,
  type ConversationRepositoryPort,
  MessageContent,
} from '@kirika-js/core/domain/conversation'
import { UserId } from '@kirika-js/core/domain/shared'
import { eq } from 'drizzle-orm'
import type { Hono } from 'hono'
import { streamSSE } from 'hono/streaming'
import { describeRoute } from 'hono-openapi'
import { problemDetailsResponseJsonSchema } from 'hono-problem-details/openapi-json-schema'
import { z } from 'zod'
import type { ChatService } from '../chat/chat.service'
import { characterRevisions } from '../db/character-schema'
import type { Auth } from '../lib/auth'
import type { Db } from '../lib/db'
import type { AppEnv } from '../lib/logger'
import { idParamSchema, jsonRequest, sessionSecurity } from './openapi'
import { problems, validationProblemHook } from './problems'

const createConversationSchema = z.object({
  characterRevisionId: z.uuid(),
  title: z.string().trim().min(1).max(200).optional(),
})

const sendMessageSchema = z.object({
  content: z.string().trim().min(1),
  model: z.string().trim().min(1).optional(),
})

export interface ChatRouteDependencies {
  readonly auth: Auth
  readonly db: Db
  readonly chatService: ChatService
  readonly conversationRepository: ConversationRepositoryPort
  readonly messageRepository: ConversationMessageRepositoryPort
}

export function mountChatRoutes(
  app: Hono<AppEnv>,
  deps: ChatRouteDependencies,
): void {
  app.post(
    '/conversations',
    describeRoute({
      tags: ['Conversations'],
      summary: '创建一对一角色会话',
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
      const session = await deps.auth.api.getSession({
        headers: c.req.raw.headers,
      })
      if (!session) {
        throw problems.create('UNAUTHORIZED', { detail: '未登录' })
      }

      const body = c.req.valid('json')
      const [revision] = await deps.db
        .select({
          id: characterRevisions.id,
          characterId: characterRevisions.characterId,
          name: characterRevisions.name,
        })
        .from(characterRevisions)
        .where(eq(characterRevisions.id, body.characterRevisionId))
        .limit(1)

      if (!revision) {
        throw problems.create('NOT_FOUND', { detail: '角色版本不存在' })
      }

      const owner = ConversationParticipant.createHuman({
        userId: new UserId(session.user.id),
        displayName: session.user.name,
        role: 'owner',
      })
      const character = ConversationParticipant.createCharacter({
        characterId: new CharacterId(revision.characterId),
        characterRevisionId: new CharacterRevisionId(revision.id),
        displayName: revision.name,
      })

      const conversation = Conversation.create({
        ownerId: new UserId(session.user.id),
        mode: 'direct',
        participants: [owner, character],
        title: body.title ?? null,
      })

      await deps.conversationRepository.save(conversation)
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
    async (c) => {
      const session = await deps.auth.api.getSession({
        headers: c.req.raw.headers,
      })
      if (!session) {
        throw problems.create('UNAUTHORIZED', { detail: '未登录' })
      }

      const { id } = c.req.valid('param')
      const conversation = await deps.conversationRepository.findById(
        new ConversationId(id),
      )
      if (!conversation) {
        throw problems.create('NOT_FOUND', { detail: '会话不存在' })
      }

      const owner = conversation.participants.find((p) => p.role === 'owner')
      if (!owner || owner.userId?.value !== session.user.id) {
        throw problems.create('FORBIDDEN', { detail: '无权访问该会话' })
      }

      const history = conversation.activeLeafMessageId
        ? await deps.messageRepository.findPathToRoot(
            conversation.id,
            conversation.activeLeafMessageId,
          )
        : []
      const body = c.req.valid('json')

      return streamSSE(c, async (stream) => {
        const startedAt = performance.now()
        const controller = new AbortController()
        stream.onAbort(() => controller.abort())

        let eventCount = 0
        try {
          for await (const event of deps.chatService.sendMessage({
            conversation,
            history,
            humanParticipantId: owner.id,
            content: MessageContent.fromText(body.content),
            model: body.model,
            signal: controller.signal,
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
        }
      })
    },
  )
}
