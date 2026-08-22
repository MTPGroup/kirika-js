import { ConversationId } from '@kirika-js/domain/conversation'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import {
  createTestDatabase,
  type TestDatabase,
} from '../testing/create-test-database'
import { seedConversation } from '../testing/fixtures'
import { SqliteConversationRepository } from './conversation.repository'

describe('SqliteConversationRepository', () => {
  let context: Awaited<ReturnType<typeof createTestDatabase>> | undefined

  let db: TestDatabase
  let repository: SqliteConversationRepository

  beforeEach(async () => {
    context = await createTestDatabase()
    db = context.db

    repository = new SqliteConversationRepository(db)
  })

  afterEach(async () => {
    await context?.dispose()
  })

  it('应该保存并恢复 Conversation 和 participants', async () => {
    const { conversation, owner, characterParticipant } =
      await seedConversation(db)

    const restored = await repository.findById(conversation.id)

    expect(restored).not.toBeNull()

    expect(restored?.id.equals(conversation.id)).toBe(true)

    expect(restored?.mode).toBe('direct')
    expect(restored?.title).toBe('Test chat')
    expect(restored?.status).toBe('active')
    expect(restored?.turnPolicy).toBe('manual')

    expect(restored?.participants).toHaveLength(2)

    expect(
      restored?.findParticipant(owner.id)?.userId?.equals(owner.userId),
    ).toBe(true)

    expect(
      restored
        ?.findParticipant(characterParticipant.id)
        ?.characterRevisionId?.equals(characterParticipant.characterRevisionId),
    ).toBe(true)
  })

  it('应该更新 Conversation metadata 与 participant', async () => {
    const { conversation, characterParticipant } = await seedConversation(db)

    conversation.rename('Renamed chat')

    conversation.renameParticipant(characterParticipant.id, 'Luna Updated')

    await repository.save(conversation)

    const restored = await repository.findById(conversation.id)

    expect(restored?.title).toBe('Renamed chat')

    expect(
      restored?.findParticipant(characterParticipant.id)?.displayName,
    ).toBe('Luna Updated')
  })

  it('应该持久化 participant left 状态', async () => {
    const { conversation, characterParticipant } = await seedConversation(db)

    conversation.removeParticipant(characterParticipant.id)

    await repository.save(conversation)

    const restored = await repository.findById(conversation.id)

    const participant = restored?.findParticipant(characterParticipant.id)

    expect(participant?.status).toBe('left')
    expect(participant?.leftAt).not.toBeNull()
  })

  it('应该持久化 archived 状态', async () => {
    const { conversation } = await seedConversation(db)

    conversation.archive()

    await repository.save(conversation)

    const restored = await repository.findById(conversation.id)

    expect(restored?.status).toBe('archived')
    expect(restored?.archivedAt).not.toBeNull()
  })

  it('应该删除 Conversation', async () => {
    const { conversation } = await seedConversation(db)

    await repository.delete(conversation.id)

    expect(await repository.findById(conversation.id)).toBeNull()
  })

  it('不存在时应该返回 null', async () => {
    expect(await repository.findById(ConversationId.generate())).toBeNull()
  })
})
