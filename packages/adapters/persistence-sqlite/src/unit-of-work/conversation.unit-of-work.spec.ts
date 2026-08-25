import { MessageContent } from '@kirika-js/core/domain/conversation'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { SqliteConversationRepository } from '~/repositories/conversation.repository'
import { SqliteConversationMessageRepository } from '~/repositories/conversation-message.repository'
import {
  createTestDatabase,
  type TestDatabase,
} from '~/testing/create-test-database'
import { seedConversation } from '~/testing/fixtures'
import { SqliteConversationUnitOfWork } from '~/unit-of-work/conversation.unit-of-work'

describe('SqliteConversationUnitOfWork', () => {
  let fixture: Awaited<ReturnType<typeof createTestDatabase>>
  let db: TestDatabase

  beforeEach(async () => {
    fixture = await createTestDatabase()
    db = fixture.db
  })

  afterEach(async () => fixture.dispose())

  it('atomically appends a human message and advances active leaf', async () => {
    const seeded = await seedConversation(db)
    const message = seeded.conversation.createHumanMessage(
      seeded.owner.id,
      MessageContent.fromText('hello'),
      null,
    )
    await new SqliteConversationUnitOfWork(db).appendMessage(
      seeded.conversation,
      message,
    )

    const saved = await new SqliteConversationRepository(db).findById(
      seeded.conversation.id,
    )
    const savedMessage = await new SqliteConversationMessageRepository(
      db,
    ).findById(message.id)
    expect(saved?.activeLeafMessageId?.value).toBe(message.id.value)
    expect(savedMessage).not.toBeNull()
  })

  it('rolls back a stale generation start when CAS is locked', async () => {
    const seeded = await seedConversation(db)
    const repository = new SqliteConversationRepository(db)
    const firstSnapshot = await repository.findById(seeded.conversation.id)
    const secondSnapshot = await repository.findById(seeded.conversation.id)
    if (!firstSnapshot || !secondSnapshot) throw new Error('会话加载失败')

    const first = firstSnapshot.createGeneratedMessage(
      seeded.characterParticipant.id,
      'model',
      null,
    )
    const second = secondSnapshot.createGeneratedMessage(
      seeded.characterParticipant.id,
      'model',
      null,
    )
    const uow = new SqliteConversationUnitOfWork(db)
    await uow.startGeneration(firstSnapshot, first)
    await expect(uow.startGeneration(secondSnapshot, second)).rejects.toThrow(
      '会话已有生成任务',
    )
    expect(
      await new SqliteConversationMessageRepository(db).findById(second.id),
    ).toBeNull()
  })

  it('checkpoints and atomically finishes generation', async () => {
    const seeded = await seedConversation(db)
    const message = seeded.conversation.createGeneratedMessage(
      seeded.characterParticipant.id,
      'model',
      null,
    )
    const uow = new SqliteConversationUnitOfWork(db)
    await uow.startGeneration(seeded.conversation, message)
    seeded.conversation.appendGeneratedTextDelta(message, 'hello')
    expect(await uow.checkpointGeneration(message)).toBe(true)
    seeded.conversation.completeGeneratedMessage(message, 'stop', null)
    await uow.finishGeneration(seeded.conversation, message)

    const saved = await new SqliteConversationRepository(db).findById(
      seeded.conversation.id,
    )
    const savedMessage = await new SqliteConversationMessageRepository(
      db,
    ).findById(message.id)
    expect(saved?.activeGenerationMessageId).toBeNull()
    expect(savedMessage?.status).toBe('completed')
    expect(savedMessage?.content.text).toBe('hello')
  })

  it('recovers interrupted generation', async () => {
    const seeded = await seedConversation(db)
    const message = seeded.conversation.createGeneratedMessage(
      seeded.characterParticipant.id,
      'model',
      null,
    )
    const uow = new SqliteConversationUnitOfWork(db)
    await uow.startGeneration(seeded.conversation, message)
    expect(await uow.recoverInterruptedGenerations()).toBe(1)

    const saved = await new SqliteConversationMessageRepository(db).findById(
      message.id,
    )
    const conversation = await new SqliteConversationRepository(db).findById(
      seeded.conversation.id,
    )
    expect(saved?.status).toBe('failed')
    expect(saved?.errorReason).toBe('应用在生成期间意外退出')
    expect(conversation?.activeGenerationMessageId).toBeNull()
  })
})
