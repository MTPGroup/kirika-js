import type { ConversationId } from '../entities/conversation.entity'
import type {
  ConversationMessage,
  ConversationMessageId,
} from '../entities/conversation-message.entity'

export const CONVERSATION_MESSAGE_REPOSITORY_PORT = Symbol(
  'CONVERSATION_MESSAGE_REPOSITORY_PORT',
)

export interface ConversationMessageRepositoryPort {
  findById(id: ConversationMessageId): Promise<ConversationMessage | null>
  findPathToRoot(
    conversationId: ConversationId,
    leafMessageId: ConversationMessageId,
  ): Promise<ConversationMessage[]>
  hasChildren(id: ConversationMessageId): Promise<boolean>
  save(message: ConversationMessage): Promise<void>
  delete(id: ConversationMessageId): Promise<void>
}
