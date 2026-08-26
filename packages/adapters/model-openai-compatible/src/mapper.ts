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
    stop: request.stopSequences ? [...request.stopSequences] : undefined,
    seed: request.seed,
  }
}

export function mapMessages(
  messages: readonly ChatModelMessage[],
): OpenAI.ChatCompletionMessageParam[] {
  return messages.map((message): OpenAI.ChatCompletionMessageParam => {
    if (message.role === 'system') {
      return { role: 'system', content: toTextContent(message) }
    }
    if (message.role === 'assistant') {
      return {
        role: 'assistant',
        name: message.name,
        content: toTextContent(message),
      }
    }
    return {
      role: 'user',
      name: message.name,
      content: toUserContent(message),
    }
  })
}

function toTextContent(message: ChatModelMessage): string {
  return message.content
    .filter((part) => part.type === 'text')
    .map((part) => part.text)
    .join('')
}

function toUserContent(
  message: ChatModelMessage,
): string | OpenAI.Chat.ChatCompletionContentPart[] {
  const hasVisualAsset = message.content.some(
    (part) => part.type === 'asset' && part.url,
  )
  if (!hasVisualAsset) {
    return toTextContent(message)
  }
  return message.content.flatMap(
    (part): OpenAI.Chat.ChatCompletionContentPart[] => {
      if (part.type === 'text') {
        return [{ type: 'text' as const, text: part.text }]
      }
      if (!part.url) {
        return []
      }
      return [
        {
          type: 'image_url' as const,
          image_url: { url: part.url, detail: 'auto' as const },
        },
      ]
    },
  )
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
