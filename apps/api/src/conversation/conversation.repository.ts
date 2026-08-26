import type {
  Conversation,
  ConversationId,
  ConversationRepositoryPort,
} from '@kirika-js/core/domain/conversation'
import { desc, eq } from 'drizzle-orm'
import {
  conversationParticipants,
  conversations,
} from '../db/conversation-schema'
import type { Db } from '../lib/db'
import { ConversationMapper } from './mapper'

export class PgConversationRepository implements ConversationRepositoryPort {
  constructor(private readonly db: Db) {}

  async findById(id: ConversationId): Promise<Conversation | null> {
    const [conversation] = await this.db
      .select()
      .from(conversations)
      .where(eq(conversations.id, id.value))
      .limit(1)

    if (!conversation) return null

    const participants = await this.db
      .select()
      .from(conversationParticipants)
      .where(eq(conversationParticipants.conversationId, id.value))
      .orderBy(conversationParticipants.joinedAt, conversationParticipants.id)

    return ConversationMapper.toDomain(conversation, participants)
  }

  async save(conversation: Conversation): Promise<void> {
    const model = ConversationMapper.toPersistence(conversation)

    await this.db.transaction(async (tx) => {
      await tx
        .insert(conversations)
        .values(model.conversation)
        .onConflictDoUpdate({
          target: conversations.id,
          set: {
            mode: model.conversation.mode,
            title: model.conversation.title,
            status: model.conversation.status,
            turnPolicy: model.conversation.turnPolicy,
            activeLeafMessageId: model.conversation.activeLeafMessageId,
            activeGenerationMessageId:
              model.conversation.activeGenerationMessageId,
            updatedAt: model.conversation.updatedAt,
            archivedAt: model.conversation.archivedAt,
          },
        })

      for (const participant of model.participants) {
        await tx
          .insert(conversationParticipants)
          .values(participant)
          .onConflictDoUpdate({
            target: conversationParticipants.id,
            set: {
              status: participant.status,
              displayName: participant.displayName,
              leftAt: participant.leftAt,
            },
          })
      }
    })
  }

  async delete(id: ConversationId): Promise<void> {
    await this.db.delete(conversations).where(eq(conversations.id, id.value))
  }

  async listByOwner(ownerId: string, limit: number, offset: number) {
    const rows = await this.db
      .select({
        id: conversations.id,
        title: conversations.title,
        mode: conversations.mode,
        status: conversations.status,
        createdAt: conversations.createdAt,
        updatedAt: conversations.updatedAt,
      })
      .from(conversations)
      .where(eq(conversations.ownerId, ownerId))
      .orderBy(desc(conversations.updatedAt))
      .limit(limit + 1)
      .offset(offset)

    const hasMore = rows.length > limit
    return { items: rows.slice(0, limit), hasMore }
  }
}
