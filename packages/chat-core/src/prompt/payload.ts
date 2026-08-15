import type { ChatMessage } from '../conversation/chat-message'

export interface PromptPayload {
	systemPrompt: string
	messages: ChatMessage[]
	postHistoryInstructions: string
	activatedLorebookKeys: string[]
	estimatedTokens: number
}
