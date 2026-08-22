import { AssetId } from '@kirika-js/domain/character'
import { describe, expect, it } from 'vitest'
import {
  ChatEngine,
  type ChatEngineEvent,
  ChatGenerationAbortedError,
  type ChatModelPort,
} from './index'
import type { ChatModelRequest, ChatModelStreamEvent } from './model/chat-model'
import {
  createDirectFixture,
  createRevisionFor,
  text,
} from './testing/fixtures'

class ScriptedModel implements ChatModelPort {
  readonly requests: ChatModelRequest[] = []

  constructor(
    private readonly script: readonly (ChatModelStreamEvent | Error)[],
  ) {}

  async *generate(
    request: ChatModelRequest,
  ): AsyncIterable<ChatModelStreamEvent> {
    this.requests.push(request)
    for (const item of this.script) {
      if (item instanceof Error) throw item
      yield item
    }
  }
}

async function collectEvents(
  stream: AsyncIterable<ChatEngineEvent>,
): Promise<ChatEngineEvent[]> {
  const events: ChatEngineEvent[] = []
  for await (const event of stream) events.push(event)
  return events
}

describe('ChatEngine', () => {
  it('驱动文本和资产流并完成 Domain 生成消息', async () => {
    const { conversation, owner, character } = createDirectFixture()
    const userMessage = conversation.createHumanMessage(
      owner.id,
      text('你好'),
      null,
    )
    const outputAssetId = new AssetId(crypto.randomUUID())
    const model = new ScriptedModel([
      { type: 'text_delta', delta: '你' },
      { type: 'text_delta', delta: '好！' },
      {
        type: 'content_part',
        part: {
          type: 'asset',
          assetId: outputAssetId,
          modality: 'image',
          mediaType: 'image/png',
          altText: '月亮',
        },
      },
      {
        type: 'finish',
        finishReason: 'stop',
        tokenUsage: { promptTokens: 12, completionTokens: 4 },
      },
    ])
    const revision = createRevisionFor(character, {
      name: 'Luna',
      systemPrompt: 'You are {{char}}.',
    })
    const engine = new ChatEngine({
      model,
      characterContextResolver: {
        resolve: async () => ({ revision, lorebooks: [] }),
      },
    })

    const events = await collectEvents(
      engine.generateTurn({
        conversation,
        history: [userMessage],
        model: ' test-model ',
        generation: {
          maxOutputTokens: 128,
          temperature: 0.7,
          metadata: { traceId: 'trace-1' },
        },
      }),
    )

    expect(events.map((event) => event.type)).toEqual([
      'started',
      'text_delta',
      'text_delta',
      'content_part',
      'completed',
    ])
    const generated = events[0]?.message
    expect(generated).toMatchObject({
      status: 'completed',
      model: 'test-model',
      finishReason: 'stop',
    })
    expect(generated?.content.text).toBe('你好！')
    expect(generated?.content.parts[1]).toMatchObject({
      type: 'asset',
      assetId: outputAssetId,
    })
    expect(generated?.tokenUsage?.totalTokens).toBe(16)
    expect(conversation.activeGenerationMessageId).toBeNull()
    expect(model.requests).toHaveLength(1)
    const request = model.requests[0]
    expect(request).toMatchObject({
      model: 'test-model',
      maxOutputTokens: 128,
      temperature: 0.7,
      metadata: { traceId: 'trace-1' },
    })
  })

  it('模型异常或缺失 finish 事件时标记失败并释放生成锁', async () => {
    for (const script of [
      [new Error('上游不可用')],
      [{ type: 'text_delta', delta: '未完成' } as const],
    ]) {
      const { conversation, owner, character } = createDirectFixture()
      const userMessage = conversation.createHumanMessage(
        owner.id,
        text('你好'),
        null,
      )
      const revision = createRevisionFor(character)
      const events = await collectEvents(
        new ChatEngine({
          model: new ScriptedModel(script),
          characterContextResolver: {
            resolve: async () => ({ revision, lorebooks: [] }),
          },
        }).generateTurn({
          conversation,
          history: [userMessage],
          model: 'test-model',
        }),
      )

      expect(events.at(-1)?.type).toBe('failed')
      expect(events[0]?.message.status).toBe('failed')
      expect(conversation.activeGenerationMessageId).toBeNull()
    }
  })

  it('AbortSignal 取消流式生成', async () => {
    const { conversation, owner, character } = createDirectFixture()
    const userMessage = conversation.createHumanMessage(
      owner.id,
      text('你好'),
      null,
    )
    const revision = createRevisionFor(character)
    const controller = new AbortController()
    const model: ChatModelPort = {
      async *generate() {
        yield { type: 'text_delta', delta: '部分内容' }
        controller.abort()
        yield { type: 'text_delta', delta: '不应写入' }
      },
    }
    const engine = new ChatEngine({
      model,
      characterContextResolver: {
        resolve: async () => ({ revision, lorebooks: [] }),
      },
    })

    const events = await collectEvents(
      engine.generateTurn({
        conversation,
        history: [userMessage],
        model: 'test-model',
        signal: controller.signal,
      }),
    )

    expect(events.map((event) => event.type)).toEqual([
      'started',
      'text_delta',
      'cancelled',
    ])
    expect(events[0]?.message.status).toBe('cancelled')
    expect(events[0]?.message.content.text).toBe('部分内容')
    expect(conversation.activeGenerationMessageId).toBeNull()
  })

  it('开始前取消不会创建 Domain 消息', async () => {
    const { conversation, owner, character } = createDirectFixture()
    const userMessage = conversation.createHumanMessage(
      owner.id,
      text('你好'),
      null,
    )
    const revision = createRevisionFor(character)
    const controller = new AbortController()
    controller.abort()
    const engine = new ChatEngine({
      model: new ScriptedModel([]),
      characterContextResolver: {
        resolve: async () => ({ revision, lorebooks: [] }),
      },
    })

    await expect(
      collectEvents(
        engine.generateTurn({
          conversation,
          history: [userMessage],
          model: 'test-model',
          signal: controller.signal,
        }),
      ),
    ).rejects.toBeInstanceOf(ChatGenerationAbortedError)
    expect(conversation.activeLeafMessageId).toEqual(userMessage.id)
    expect(conversation.activeGenerationMessageId).toBeNull()
  })

  it('消费者提前停止迭代时取消消息并释放生成锁', async () => {
    const { conversation, owner, character } = createDirectFixture()
    const userMessage = conversation.createHumanMessage(
      owner.id,
      text('你好'),
      null,
    )
    const revision = createRevisionFor(character)
    const engine = new ChatEngine({
      model: new ScriptedModel([{ type: 'text_delta', delta: '内容' }]),
      characterContextResolver: {
        resolve: async () => ({ revision, lorebooks: [] }),
      },
    })
    let generated: ChatEngineEvent['message'] | undefined

    for await (const event of engine.generateTurn({
      conversation,
      history: [userMessage],
      model: 'test-model',
    })) {
      generated = event.message
      break
    }

    expect(generated?.status).toBe('cancelled')
    expect(conversation.activeGenerationMessageId).toBeNull()
  })
})
