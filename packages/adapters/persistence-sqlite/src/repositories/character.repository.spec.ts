import {
  Asset,
  Character,
  CharacterId,
  CharacterLorebookReference,
  CharacterRevisionAsset,
} from '@kirika-js/core/domain/character'
import { Lorebook, LorebookEntry } from '@kirika-js/core/domain/lorebook'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { SqliteAssetRepository } from '~/repositories/asset.repository'
import { SqliteCharacterRepository } from '~/repositories/character.repository'
import { SqliteLorebookRepository } from '~/repositories/lorebook.repository'
import {
  createTestDatabase,
  type TestDatabase,
} from '~/testing/create-test-database'
import { seedUser } from '~/testing/fixtures'

describe('SqliteCharacterRepository', () => {
  let context: Awaited<ReturnType<typeof createTestDatabase>> | undefined

  let db: TestDatabase
  let repository: SqliteCharacterRepository

  beforeEach(async () => {
    context = await createTestDatabase()
    db = context.db

    repository = new SqliteCharacterRepository(db)
  })

  afterEach(async () => {
    await context?.dispose()
  })

  it('应该保存并恢复角色草稿', async () => {
    const ownerId = await seedUser(db)

    const character = Character.create({
      ownerId,
      alias: 'Luna Alias',

      initialRevision: {
        name: 'Luna',
        description: 'Moon witch',
        personality: 'Calm',
        scenario: 'Moon palace',
        systemPrompt: 'You are Luna.',
        postHistoryInstructions: 'Remain in character.',
        greetings: ['Hello.'],
        examples: ['Example'],
        extensions: {
          source: 'test',
        },
      },
    })

    await repository.save(character)

    const restored = await repository.findById(character.id)

    expect(restored).not.toBeNull()

    expect(restored?.id.equals(character.id)).toBe(true)

    expect(restored?.ownerId.equals(ownerId)).toBe(true)

    expect(restored?.alias).toBe('Luna Alias')

    expect(restored?.draftRevision).toMatchObject({
      revisionNumber: 1,
      isDraft: true,
      name: 'Luna',
      description: 'Moon witch',
      personality: 'Calm',
      scenario: 'Moon palace',
      systemPrompt: 'You are Luna.',
      postHistoryInstructions: 'Remain in character.',
    })

    expect(restored?.draftRevision?.greetings).toEqual(['Hello.'])

    expect(restored?.draftRevision?.examples).toEqual(['Example'])

    expect(restored?.draftRevision?.extensions).toEqual({
      source: 'test',
    })
  })

  it('应该更新现有 draft', async () => {
    const ownerId = await seedUser(db)

    const character = Character.create({
      ownerId,

      initialRevision: {
        name: 'Luna',
        greetings: ['Hello.'],
      },
    })

    await repository.save(character)

    const draft = character.draftRevision
    if (!draft) {
      throw new Error('草稿版本为空')
    }

    character.updateDraftContent(draft.id, {
      personality: 'Updated personality',
    })

    character.replaceDraftGreetings(draft.id, ['Good evening.'])

    await repository.save(character)

    const restored = await repository.findById(character.id)

    expect(restored?.draftRevision?.personality).toBe('Updated personality')

    expect(restored?.draftRevision?.greetings).toEqual(['Good evening.'])
  })

  it('应该持久化 publish 状态', async () => {
    const ownerId = await seedUser(db)

    const character = Character.create({
      ownerId,

      initialRevision: {
        name: 'Luna',
        greetings: ['Hello.'],
      },
    })

    await repository.save(character)

    const draft = character.draftRevision
    if (!draft) {
      throw new Error('草稿版本为空')
    }

    character.publishRevision(draft.id)

    await repository.save(character)

    const restored = await repository.findById(character.id)

    expect(restored?.draftRevision).toBeNull()

    expect(restored?.currentRevision?.id.equals(draft.id)).toBe(true)

    expect(restored?.currentRevision?.isDraft).toBe(false)
  })

  it('应该恢复 revision 的 Asset 和 Lorebook 引用', async () => {
    const ownerId = await seedUser(db)

    const assetRepository = new SqliteAssetRepository(db)

    const asset = Asset.create(
      'assets/luna.png',
      'image/png',
      1024,
      'a'.repeat(64),
    )

    await assetRepository.save(asset)

    const lorebookRepository = new SqliteLorebookRepository(db)

    const lorebook = Lorebook.create('Moon Lore', '', ownerId)

    const loreDraft = lorebook.draftRevision
    if (!loreDraft) {
      throw new Error('草稿版本为空')
    }

    lorebook.replaceRevisionEntries(loreDraft.id, [
      LorebookEntry.create(
        ['moon'],
        'Moon',
        true,
        'Moon lore',
        'before_history',
        100,
      ),
    ])

    await lorebookRepository.save(lorebook)

    lorebook.publishRevision(loreDraft.id)

    await lorebookRepository.save(lorebook)

    const loreRevision = lorebook.currentRevision
    if (!loreRevision) {
      throw new Error('世界书当前版本为空')
    }

    const character = Character.create({
      ownerId,

      initialRevision: {
        name: 'Luna',
        greetings: ['Hello.'],

        assets: [
          new CharacterRevisionAsset({
            assetId: asset.id,
            kind: 'avatar',
            name: 'main',
            uri: `asset://${asset.id.value}`,
            ordinal: 0,
            extensions: {
              crop: 'center',
            },
          }),
        ],

        lorebooks: [
          new CharacterLorebookReference({
            lorebookRevisionId: loreRevision.id,
            ordinal: 0,
            enabled: true,
          }),
        ],
      },
    })

    await repository.save(character)

    const restored = await repository.findById(character.id)

    const restoredDraft = restored?.draftRevision

    expect(restoredDraft?.assets).toHaveLength(1)

    expect(restoredDraft?.assets[0]?.assetId.equals(asset.id)).toBe(true)

    expect(restoredDraft?.assets[0]).toMatchObject({
      kind: 'avatar',
      name: 'main',
      ordinal: 0,
      uri: `asset://${asset.id.value}`,
    })

    expect(restoredDraft?.lorebooks).toHaveLength(1)

    expect(
      restoredDraft?.lorebooks[0]?.lorebookRevisionId.equals(loreRevision.id),
    ).toBe(true)
  })

  it('应该删除 Character', async () => {
    const ownerId = await seedUser(db)

    const character = Character.create({
      ownerId,
      initialRevision: {
        name: 'Luna',
      },
    })

    await repository.save(character)
    await repository.delete(character.id)

    expect(await repository.findById(character.id)).toBeNull()
  })

  it('不存在的 Character 应该返回 null', async () => {
    expect(await repository.findById(CharacterId.generate())).toBeNull()
  })
})
