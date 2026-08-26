import type {
  ChatModelFinishReason,
  ChatModelMessage,
  ChatModelRequest,
} from '@kirika-js/core/chat'
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
    stop: request.stopSequences,
    seed: request.seed,
  }
}

export function mapMessages(
  messages: readonly ChatModelMessage[],
): OpenAI.ChatCompletionMessageParam[] {
  return messages.map((message) => ({
    role: message.role,
    name: message.name,
    content: mapMessageContent(message),
  }))
}

function mapMessageContent(
  message: ChatModelMessage,
): string | OpenAI.Chat.ChatCompletionContentPart[] {
  const hasAsset = message.content.some((part) => part.type === 'asset')
  if (!hasAsset) {
    return message.content
      .filter((part) => part.type === 'text')
      .map((part) => part.text)
      .join('')
  }

  return message.content.map((part) => {
    if (part.type === 'text') {
      return { type: 'text', text: part.text }
    }
    return {
      type: 'image_url',
      image_url: { url: part.url ?? '', detail: 'auto' },
    }
  })
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
