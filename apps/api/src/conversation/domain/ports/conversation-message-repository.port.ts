import type { ConversationId } from '../conversation.entity'
import type {
	ConversationMessage,
	ConversationMessageId,
} from '../conversation-message.entity'

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
}
