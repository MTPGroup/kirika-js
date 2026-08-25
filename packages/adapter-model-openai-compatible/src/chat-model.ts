import {
  ChatModelAbortError,
  ChatModelAuthError,
  ChatModelConnectionError,
  type ChatModelPort,
  ChatModelRateLimitError,
  type ChatModelRequest,
  type ChatModelStreamEvent,
  type TokenUsage,
} from '@kirika-js/core/chat'
import OpenAI from 'openai'
import { mapFinishReason, mapRequests } from './mapper'

export class OpenAICompatibleChatModel implements ChatModelPort {
  private readonly client: OpenAI

  constructor(options: {
    baseUrl: string
    apiKey?: string
    client?: OpenAI
  }) {
    this.client =
      options.client ??
      new OpenAI({
        baseURL: options.baseUrl,
        apiKey: options.apiKey ?? 'dummy',
      })
  }

  async *generate(
    request: ChatModelRequest,
    signal?: AbortSignal,
  ): AsyncIterable<ChatModelStreamEvent> {
    try {
      const stream = await this.client.chat.completions.create(
        mapRequests(request),
        {
          signal,
        },
      )

      let usage: TokenUsage | undefined

      for await (const chunk of stream) {
        const choice = chunk.choices[0]

        if (chunk.usage) {
          usage = {
            promptTokens: chunk.usage.prompt_tokens,
            completionTokens: chunk.usage.completion_tokens,
            totalTokens: chunk.usage.total_tokens,
          }
        }
        const delta = choice?.delta.content

        if (delta) {
          yield {
            type: 'text_delta',
            delta,
          }
        }

        const finish = choice?.finish_reason

        if (finish) {
          yield {
            type: 'finish',
            finishReason: mapFinishReason(finish),
            tokenUsage: usage,
          }
        }
      }
    } catch (error) {
      if (error instanceof OpenAI.APIUserAbortError) {
        throw new ChatModelAbortError(error.message)
      } else if (error instanceof OpenAI.APIConnectionError) {
        throw new ChatModelConnectionError(error.message)
      } else if (error instanceof OpenAI.RateLimitError) {
        throw new ChatModelRateLimitError(error.message)
      } else if (error instanceof OpenAI.AuthenticationError) {
        throw new ChatModelAuthError(error.message)
      }

      throw error
    }
  }
}
