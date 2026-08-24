import { Lorebook, LorebookEntry, LorebookId } from '@kirika-js/domain/lorebook'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { SqliteLorebookRepository } from '~/repositories/lorebook.repository'
import {
  createTestDatabase,
  type TestDatabase,
} from '~/testing/create-test-database'
import { seedUser } from '~/testing/fixtures'

describe('SqliteLorebookRepository', () => {
  let context: Awaited<ReturnType<typeof createTestDatabase>> | undefined

  let db: TestDatabase
  let repository: SqliteLorebookRepository

  beforeEach(async () => {
    context = await createTestDatabase()
    db = context.db

    repository = new SqliteLorebookRepository(db)
  })

  afterEach(async () => {
    await context?.dispose()
  })

  it('应该保存并完整恢复 Lorebook 草稿', async () => {
    const ownerId = await seedUser(db)

    const lorebook = Lorebook.create('Moon Lore', 'Moon world', ownerId)

    const draft = lorebook.draftRevision
    expect(draft).not.toBeNull()
    if (!draft) {
      throw new Error('草稿版本为空')
    }

    const entry = LorebookEntry.create(
      ['moon', 'Luna'],
      'Moon Magic',
      true,
      'Luna uses moon magic.',
      'before_history',
      100,
    )

    lorebook.replaceRevisionEntries(draft.id, [entry])

    await repository.save(lorebook)

    const restored = await repository.findById(lorebook.id)

    expect(restored).not.toBeNull()
    expect(restored?.id.equals(lorebook.id)).toBe(true)
    expect(restored?.name).toBe('Moon Lore')
    expect(restored?.description).toBe('Moon world')

    const restoredDraft = restored?.draftRevision

    expect(restoredDraft).not.toBeNull()
    expect(restoredDraft?.entries).toHaveLength(1)

    expect(restoredDraft?.entries[0]).toMatchObject({
      title: 'Moon Magic',
      enabled: true,
      content: 'Luna uses moon magic.',
      position: 'before_history',
      priority: 100,
    })

    expect(restoredDraft?.entries[0]?.keys).toEqual(['moon', 'Luna'])
  })

  it('应该删除草稿中已经移除的 entry', async () => {
    const ownerId = await seedUser(db)

    const lorebook = Lorebook.create('Lore', '', ownerId)

    const draft = lorebook.draftRevision
    if (!draft) {
      throw new Error('草稿版本为空')
    }

    const first = LorebookEntry.create(
      ['first'],
      'First',
      true,
      'First content',
      'after_history',
      1,
    )

    const second = LorebookEntry.create(
      ['second'],
      'Second',
      true,
      'Second content',
      'after_history',
      2,
    )

    lorebook.replaceRevisionEntries(draft.id, [first, second])

    await repository.save(lorebook)

    lorebook.replaceRevisionEntries(draft.id, [second])

    await repository.save(lorebook)

    const restored = await repository.findById(lorebook.id)

    expect(restored?.draftRevision?.entries).toHaveLength(1)

    expect(restored?.draftRevision?.entries[0]?.id.equals(second.id)).toBe(true)
  })

  it('应该持久化发布状态及 visibility', async () => {
    const ownerId = await seedUser(db)

    const lorebook = Lorebook.create('Lore', '', ownerId)

    const draft = lorebook.draftRevision
    if (!draft) {
      throw new Error('草稿版本为空')
    }

    lorebook.replaceRevisionEntries(draft.id, [
      LorebookEntry.create(
        ['moon'],
        'Moon',
        true,
        'Moon content',
        'before_history',
        0,
      ),
    ])

    await repository.save(lorebook)

    lorebook.publishRevision(draft.id)
    lorebook.changeVisibility('public')

    await repository.save(lorebook)

    const restored = await repository.findById(lorebook.id)

    expect(restored?.currentRevision).not.toBeNull()

    expect(restored?.currentRevision?.isDraft).toBe(false)

    expect(restored?.visibility).toBe('public')
  })

  it('应该删除 Lorebook', async () => {
    const ownerId = await seedUser(db)

    const lorebook = Lorebook.create('Lore', '', ownerId)

    await repository.save(lorebook)
    await repository.delete(lorebook.id)

    expect(await repository.findById(lorebook.id)).toBeNull()
  })

  it('不存在的 Lorebook 应该返回 null', async () => {
    expect(await repository.findById(LorebookId.generate())).toBeNull()
  })
})
