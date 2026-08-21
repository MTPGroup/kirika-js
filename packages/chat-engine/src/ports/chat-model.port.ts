import type {
	ChatModelRequest,
	ChatModelStreamEvent,
} from '../model/chat-model'

export interface ChatModelPort {
	generate(
		request: ChatModelRequest,
		signal?: AbortSignal,
	): AsyncIterable<ChatModelStreamEvent>
}
