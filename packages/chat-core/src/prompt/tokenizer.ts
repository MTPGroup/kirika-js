import type { ChatMessage, MessageContent } from '../conversation/chat-message'
import type { PromptDraft } from './draft'

export interface PromptTokenEstimate {
	systemPromptTokens: number
	messageTokens: number[]
	postHistoryInstructionTokens: number
	protocolOverheadTokens: number
	totalInputTokens: number
}

export interface PromptTokenizer {
	estimateContentTokens(content: MessageContent): number
	estimateMessageTokens(message: ChatMessage): number
	estimatePromptTokens(prompt: PromptDraft): PromptTokenEstimate
}
