import type {
  ConversationId,
  ConversationMessage,
  ConversationMessageId,
  ConversationMessageRepositoryPort,
} from '@kirika-js/core/domain/conversation'
import { eq } from 'drizzle-orm'
import { conversationMessages } from '../db/conversation-schema'
import type { Db } from '../lib/db'
import { ConversationMapper } from './mapper'

export class PgConversationMessageRepository
  implements ConversationMessageRepositoryPort
{
  constructor(private readonly db: Db) {}

  async findById(
    id: ConversationMessageId,
  ): Promise<ConversationMessage | null> {
    const [raw] = await this.db
      .select()
      .from(conversationMessages)
      .where(eq(conversationMessages.id, id.value))
      .limit(1)

    return raw ? ConversationMapper.messageToDomain(raw) : null
  }

  async findPathToRoot(
    conversationId: ConversationId,
    leafMessageId: ConversationMessageId,
  ): Promise<ConversationMessage[]> {
    const path: ConversationMessage[] = []
    const visited = new Set<string>()

    let currentId: ConversationMessageId | null = leafMessageId

    while (currentId) {
      if (visited.has(currentId.value)) {
        throw new Error(`消息树存在循环: ${currentId.value}`)
      }

      visited.add(currentId.value)

      const message = await this.findById(currentId)

      if (!message) {
        throw new Error(`消息链不完整，未找到消息: ${currentId.value}`)
      }

      if (!message.conversationId.equals(conversationId)) {
        throw new Error('消息链包含其他会话的消息')
      }

      path.unshift(message)
      currentId = message.parentMessageId
    }

    return path
  }

  async hasChildren(id: ConversationMessageId): Promise<boolean> {
    const [child] = await this.db
      .select({ id: conversationMessages.id })
      .from(conversationMessages)
      .where(eq(conversationMessages.parentMessageId, id.value))
      .limit(1)

    return child !== undefined
  }

  async save(message: ConversationMessage): Promise<void> {
    const model = ConversationMapper.messageToPersistence(message)

    await this.db
      .insert(conversationMessages)
      .values(model)
      .onConflictDoUpdate({
        target: conversationMessages.id,
        set: {
          status: model.status,
          content: model.content,
          finishReason: model.finishReason,
          tokenUsage: model.tokenUsage,
          errorReason: model.errorReason,
          updatedAt: model.updatedAt,
        },
      })
  }
}
