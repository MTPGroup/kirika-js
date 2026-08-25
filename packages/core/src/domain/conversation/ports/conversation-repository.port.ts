import type {
  Conversation,
  ConversationId,
} from '../entities/conversation.entity'

export const CONVERSATION_REPOSITORY_PORT = Symbol(
  'CONVERSATION_REPOSITORY_PORT',
)

export interface ConversationRepositoryPort {
  findById(id: ConversationId): Promise<Conversation | null>
  save(conversation: Conversation): Promise<void>
  delete(id: ConversationId): Promise<void>
}
