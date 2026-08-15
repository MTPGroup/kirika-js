import type { ChatMessage } from '../conversation/chat-message'

export interface PromptDraft {
	systemPrompt: string
	messages: ChatMessage[]
	postHistoryInstructions: string
}
