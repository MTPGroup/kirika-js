import {
  type Conversation,
  ConversationId,
  type ConversationRepositoryPort,
} from '@kirika-js/domain/conversation'
import { eq } from 'drizzle-orm'
import type { SqliteDatabase } from '../database'
import { ConversationMapper } from '../mappers/conversation.mapper'
import {
  conversationParticipants,
  conversations,
} from '../schema/conversation.schema'

export class SqliteConversationRepository
  implements ConversationRepositoryPort
{
  constructor(private readonly db: SqliteDatabase) {}

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

  async findAll(): Promise<Conversation[]> {
    const rows = await this.db.select({ id: conversations.id }).from(conversations)
    const results = await Promise.all(
      rows.map((row) => this.findById(new ConversationId(row.id))),
    )
    return results.filter((value): value is Conversation => value !== null)
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
}
