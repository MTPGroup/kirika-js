import type {
  ChatModelFinishReason,
  ChatModelRequest,
} from '@kirika-js/chat-engine'
import { AssetId } from '@kirika-js/domain'
import { describe, expect, it } from 'vitest'
import { mapFinishReason, mapMessages, mapRequests } from './mapper'

describe('OpenAI Compatible Mapper', () => {
  describe('mapRequests', () => {
    it('应该将 ChatModelRequest 转换为 OpenAI 流式请求参数', () => {
      const request: ChatModelRequest = {
        model: 'gpt-test',
        messages: [
          {
            role: 'user',
            name: '用户',
            content: [
              {
                type: 'text',
                text: '你好',
              },
            ],
          },
        ],
        temperature: 0.7,
        topP: 0.9,
        maxOutputTokens: 512,
      }

      const result = mapRequests(request)

      expect(result).toMatchObject({
        model: 'gpt-test',
        stream: true,
        stream_options: {
          include_usage: true,
        },
        temperature: 0.7,
        top_p: 0.9,
        max_tokens: 512,
      })

      expect(result.messages).toEqual([
        {
          role: 'user',
          name: '用户',
          content: '你好',
        },
      ])
    })

    it('应该保留缺省生成参数', () => {
      const request: ChatModelRequest = {
        model: 'gpt-test',
        messages: [],
      }

      const result = mapRequests(request)

      expect(result).toMatchObject({
        model: 'gpt-test',
        stream: true,
        stream_options: {
          include_usage: true,
        },
      })

      expect(result.temperature).toBeUndefined()
      expect(result.top_p).toBeUndefined()
      expect(result.max_completion_tokens).toBeUndefined()
    })
  })

  describe('mapMessages', () => {
    it('应该将文本消息转换为 OpenAI message 格式', () => {
      const result = mapMessages([
        {
          role: 'user',
          name: 'Alice',
          content: [
            {
              type: 'text',
              text: '你好',
            },
          ],
        },
      ])

      expect(result).toEqual([
        {
          role: 'user',
          name: 'Alice',
          content: '你好',
        },
      ])
    })

    it('应该合并同一消息中的多个文本内容片段', () => {
      const result = mapMessages([
        {
          role: 'assistant',
          content: [
            {
              type: 'text',
              text: '你好',
            },
            {
              type: 'text',
              text: '世界',
            },
          ],
        },
      ])

      expect(result).toEqual([
        {
          role: 'assistant',
          name: undefined,
          content: '你好世界',
        },
      ])
    })

    it('应该忽略 OpenAI 暂不支持的非文本内容片段', () => {
      const result = mapMessages([
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: '图片如下',
            },
            {
              type: 'asset',
              assetId: AssetId.generate(),
              mediaType: 'image/png',
              modality: 'image',
              altText: '',
            },
          ],
        },
      ])

      expect(result).toEqual([
        {
          role: 'user',
          name: undefined,
          content: '图片如下',
        },
      ])
    })
  })

  describe('mapFinishReason', () => {
    it.each([
      ['stop', 'stop'],
      ['length', 'length'],
      ['content_filter', 'content_filter'],
      ['tool_calls', 'tool_call'],
      ['function_call', 'tool_call'],
      [null, 'unknown'],
    ] as const)(
      '应该将 OpenAI finish_reason "%s" 转换为 "%s"',
      (input, expected) => {
        const result = mapFinishReason(input)

        expect(result).toBe(expected satisfies ChatModelFinishReason)
      },
    )
  })
})
