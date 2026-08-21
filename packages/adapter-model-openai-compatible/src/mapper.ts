import type {
	ChatModelFinishReason,
	ChatModelMessage,
	ChatModelRequest,
} from '@kirika-js/chat-engine'
import type OpenAI from 'openai'

export function mapRequests(
	request: ChatModelRequest,
): OpenAI.Chat.Completions.ChatCompletionCreateParamsStreaming {
	return {
		model: request.model,
		stream: true,
		stream_options: {
			include_usage: true,
		},
		messages: mapMessages(request.messages),
		temperature: request.temperature,
		top_p: request.topP,
		max_tokens: request.maxOutputTokens,
	}
}

export function mapMessages(
	messages: readonly ChatModelMessage[],
): OpenAI.ChatCompletionMessageParam[] {
	return messages.map((message) => ({
		role: message.role,
		name: message.name,
		content: message.content
			.filter((part) => part.type === 'text')
			.map((part) => part.text)
			.join(''),
	}))
}

export function mapFinishReason(
	reason: OpenAI.Chat.Completions.ChatCompletionChunk.Choice['finish_reason'],
): ChatModelFinishReason {
	switch (reason) {
		case 'stop':
			return 'stop'

		case 'length':
			return 'length'

		case 'content_filter':
			return 'content_filter'

		case 'tool_calls':
		case 'function_call':
			return 'tool_call'

		default:
			return 'unknown'
	}
}
