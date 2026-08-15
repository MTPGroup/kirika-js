import type { PromptPayload } from '../prompt'

export interface ChatTransport {
	sendStream(
		payload: PromptPayload,
		signal?: AbortSignal,
	): AsyncIterable<string>
}
