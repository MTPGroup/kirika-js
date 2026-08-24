import {
  ConversationId,
  ConversationMessageId,
  MessageContent,
  TokenUsage,
} from '@kirika-js/domain/conversation'
import { eq } from 'drizzle-orm'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { SqliteConversationMessageRepository } from '~/repositories/conversation-message.repository'
import { conversationMessages } from '~/schema'
import {
  createTestDatabase,
  type TestDatabase,
} from '~/testing/create-test-database'
import { seedConversation } from '~/testing/fixtures'

describe('SqliteConversationMessageRepository', () => {
  let context: Awaited<ReturnType<typeof createTestDatabase>> | undefined

  let db: TestDatabase

  let repository: SqliteConversationMessageRepository

  beforeEach(async () => {
    context = await createTestDatabase()
    db = context.db

    repository = new SqliteConversationMessageRepository(db)
  })

  afterEach(async () => {
    await context?.dispose()
  })

  it('应该保存并通过 ID 恢复消息', async () => {
    const { conversation, owner } = await seedConversation(db)

    const message = conversation.createHumanMessage(
      owner.id,
      MessageContent.fromText('Hello'),
      null,
    )

    await repository.save(message)

    const restored = await repository.findById(message.id)

    expect(restored).not.toBeNull()
    expect(restored?.id.equals(message.id)).toBe(true)

    expect(restored?.source).toBe('human')
    expect(restored?.status).toBe('completed')
    expect(restored?.content.text).toBe('Hello')
    expect(restored?.parentMessageId).toBeNull()
  })

  it('应该通过 recursive CTE 返回 root -> leaf 路径', async () => {
    const { conversation, owner, characterParticipant } =
      await seedConversation(db)

    const root = conversation.createHumanMessage(
      owner.id,
      MessageContent.fromText('Root'),
      null,
    )

    const reply = conversation.createGreetingMessage(
      characterParticipant.id,
      MessageContent.fromText('Reply'),
      root,
    )

    const leaf = conversation.createHumanMessage(
      owner.id,
      MessageContent.fromText('Leaf'),
      reply,
    )

    await repository.save(root)
    await repository.save(reply)
    await repository.save(leaf)

    const path = await repository.findPathToRoot(conversation.id, leaf.id)

    expect(path.map((message) => message.id.value)).toEqual([
      root.id.value,
      reply.id.value,
      leaf.id.value,
    ])

    expect(path.map((message) => message.content.text)).toEqual([
      'Root',
      'Reply',
      'Leaf',
    ])
  })

  it('hasChildren 应该正确判断节点是否存在子消息', async () => {
    const { conversation, owner, characterParticipant } =
      await seedConversation(db)

    const root = conversation.createHumanMessage(
      owner.id,
      MessageContent.fromText('Root'),
      null,
    )

    const child = conversation.createGreetingMessage(
      characterParticipant.id,
      MessageContent.fromText('Child'),
      root,
    )

    await repository.save(root)
    await repository.save(child)

    expect(await repository.hasChildren(root.id)).toBe(true)

    expect(await repository.hasChildren(child.id)).toBe(false)
  })

  it('应该更新模型生成消息的 streaming/completed 状态', async () => {
    const { conversation, owner, characterParticipant } =
      await seedConversation(db)

    const root = conversation.createHumanMessage(
      owner.id,
      MessageContent.fromText('Hello'),
      null,
    )

    await repository.save(root)

    const generated = conversation.createGeneratedMessage(
      characterParticipant.id,
      'test-model',
      root,
    )

    // pending
    await repository.save(generated)

    conversation.appendGeneratedTextDelta(generated, 'Hello ')

    conversation.appendGeneratedTextDelta(generated, 'world')

    // streaming
    await repository.save(generated)

    conversation.completeGeneratedMessage(
      generated,
      'stop',
      new TokenUsage({
        promptTokens: 10,
        completionTokens: 2,
      }),
    )

    // completed
    await repository.save(generated)

    const restored = await repository.findById(generated.id)

    expect(restored?.source).toBe('generated')
    expect(restored?.status).toBe('completed')
    expect(restored?.model).toBe('test-model')
    expect(restored?.finishReason).toBe('stop')
    expect(restored?.content.text).toBe('Hello world')

    expect(restored?.tokenUsage?.promptTokens).toBe(10)

    expect(restored?.tokenUsage?.completionTokens).toBe(2)
  })

  it('recursive CTE 应该检测损坏的循环消息链', async () => {
    const { conversation, owner, characterParticipant } =
      await seedConversation(db)

    const root = conversation.createHumanMessage(
      owner.id,
      MessageContent.fromText('Root'),
      null,
    )

    const child = conversation.createGreetingMessage(
      characterParticipant.id,
      MessageContent.fromText('Child'),
      root,
    )

    await repository.save(root)
    await repository.save(child)

    await db
      .update(conversationMessages)
      .set({
        parentMessageId: child.id.value,
      })
      .where(eq(conversationMessages.id, root.id.value))

    await expect(
      repository.findPathToRoot(conversation.id, child.id),
    ).rejects.toThrow(/循环/)
  })

  it('使用错误 conversationId 查询路径应该失败', async () => {
    const { conversation, owner } = await seedConversation(db)

    const root = conversation.createHumanMessage(
      owner.id,
      MessageContent.fromText('Root'),
      null,
    )

    await repository.save(root)

    await expect(
      repository.findPathToRoot(ConversationId.generate(), root.id),
    ).rejects.toThrow()
  })

  it('不存在的消息应该返回 null', async () => {
    expect(
      await repository.findById(ConversationMessageId.generate()),
    ).toBeNull()
  })
})
