import {
  ChatModelAuthError,
  ChatModelConnectionError,
  ChatModelRateLimitError,
  type ChatModelRequest,
} from '@kirika-js/chat-engine'
import OpenAI from 'openai'
import { describe, expect, it, vi } from 'vitest'
import { OpenAICompatibleChatModel } from './chat-model'

function createRequest(): ChatModelRequest {
  return {
    model: 'test-model',
    messages: [
      {
        role: 'user',
        content: [
          {
            type: 'text',
            text: 'hello',
          },
        ],
      },
    ],
  }
}

function createMockClient(create: (...args: unknown[]) => unknown): OpenAI {
  return {
    chat: {
      completions: {
        create,
      },
    },
  } as unknown as OpenAI
}

describe('OpenAICompatibleChatModel', () => {
  it('应该将请求参数转换为 OpenAI 请求格式', async () => {
    const create = vi.fn(async () =>
      (async function* () {
        yield {
          choices: [
            {
              delta: {},
              finish_reason: 'stop',
            },
          ],
        }
      })(),
    )

    const model = new OpenAICompatibleChatModel({
      baseUrl: 'test',
      client: createMockClient(create),
    })

    await collect(model.generate(createRequest()))

    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({
        model: 'test-model',
        stream: true,
        stream_options: {
          include_usage: true,
        },
        messages: [
          {
            role: 'user',
            content: 'hello',
          },
        ],
      }),
      expect.any(Object),
    )
  })

  describe('OpenAI 错误映射', () => {
    it('应该将连接错误转换为 ChatModelConnectionError', async () => {
      const model = createErrorModel(
        new OpenAI.APIConnectionError({
          message: 'network error',
        }),
      )

      await expect(
        collect(model.generate(createRequest())),
      ).rejects.toBeInstanceOf(ChatModelConnectionError)
    })

    it('应该将限流错误转换为 ChatModelRateLimitError', async () => {
      const model = createErrorModel(
        new OpenAI.RateLimitError(429, {}, 'too many requests', new Headers()),
      )

      await expect(
        collect(model.generate(createRequest())),
      ).rejects.toBeInstanceOf(ChatModelRateLimitError)
    })

    it('应该将认证错误转换为 ChatModelAuthError', async () => {
      const model = createErrorModel(
        new OpenAI.AuthenticationError(401, {}, 'unauthorized', new Headers()),
      )

      await expect(
        collect(model.generate(createRequest())),
      ).rejects.toBeInstanceOf(ChatModelAuthError)
    })
  })
})

// function createStreamClient(): OpenAI {
// 	return createMockClient(async () =>
// 		(async function* () {
// 			yield {
// 				choices: [
// 					{
// 						delta: {
// 							content: 'hello',
// 						},
// 						finish_reason: null,
// 					},
// 				],
// 			}
//
// 			yield {
// 				choices: [
// 					{
// 						delta: {},
// 						finish_reason: 'stop',
// 					},
// 				],
// 				usage: {
// 					prompt_tokens: 1,
// 					completion_tokens: 1,
// 					total_tokens: 2,
// 				},
// 			}
// 		})(),
// 	)
// }
//
// function createAbortClient(): OpenAI {
// 	return createMockClient(async () => {
// 		throw new OpenAI.APIUserAbortError()
// 	})
// }

function createErrorModel(error: Error) {
  return new OpenAICompatibleChatModel({
    baseUrl: 'test',
    client: createMockClient(async () => {
      throw error
    }),
  })
}

async function collect<T>(iterable: AsyncIterable<T>): Promise<T[]> {
  const result: T[] = []

  for await (const item of iterable) {
    result.push(item)
  }

  return result
}
