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
import { z } from 'zod'
import type { ChatService } from '../chat/chat.service.js'
import { characterRevisions } from '../db/character-schema.js'
import type { Auth } from '../lib/auth.js'
import type { Db } from '../lib/db.js'

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

export function mountChatRoutes(app: Hono, deps: ChatRouteDependencies): void {
  app.post('/api/conversations', async (c) => {
    const session = await deps.auth.api.getSession({
      headers: c.req.raw.headers,
    })
    if (!session) return c.json({ error: 'unauthorized' }, 401)

    const body = createConversationSchema.safeParse(await c.req.json())
    if (!body.success) return c.json({ error: z.treeifyError(body.error) }, 400)

    const [revision] = await deps.db
      .select({
        id: characterRevisions.id,
        characterId: characterRevisions.characterId,
        name: characterRevisions.name,
      })
      .from(characterRevisions)
      .where(eq(characterRevisions.id, body.data.characterRevisionId))
      .limit(1)

    if (!revision) return c.json({ error: 'character revision not found' }, 404)

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
      title: body.data.title ?? null,
    })

    await deps.conversationRepository.save(conversation)

    return c.json({ id: conversation.id.value }, 201)
  })

  app.post('/api/conversations/:id/messages', async (c) => {
    const session = await deps.auth.api.getSession({
      headers: c.req.raw.headers,
    })
    if (!session) return c.json({ error: 'unauthorized' }, 401)

    const conversationId = c.req.param('id')
    const conversation = await deps.conversationRepository.findById(
      new ConversationId(conversationId),
    )
    if (!conversation) return c.json({ error: 'conversation not found' }, 404)

    const body = sendMessageSchema.safeParse(await c.req.json())
    if (!body.success) return c.json({ error: z.treeifyError(body.error) }, 400)

    const owner = conversation.participants.find((p) => p.role === 'owner')
    if (!owner || owner.userId?.value !== session.user.id) {
      return c.json({ error: 'forbidden' }, 403)
    }

    const history = conversation.activeLeafMessageId
      ? await deps.messageRepository.findPathToRoot(
          conversation.id,
          conversation.activeLeafMessageId,
        )
      : []

    return streamSSE(c, async (stream) => {
      const controller = new AbortController()
      stream.onAbort(() => controller.abort())

      try {
        for await (const event of deps.chatService.sendMessage({
          conversation,
          history,
          humanParticipantId: owner.id,
          content: MessageContent.fromText(body.data.content),
          model: body.data.model,
          signal: controller.signal,
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
      }
    })
  })
}
