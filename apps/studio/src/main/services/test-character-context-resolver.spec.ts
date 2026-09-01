import {
  Character,
  CharacterLorebookReference,
  type CharacterRevisionId,
} from '@kirika-js/core/domain/character'
import { Lorebook, LorebookEntry } from '@kirika-js/core/domain/lorebook'
import { UserId } from '@kirika-js/core/domain/shared'
import { describe, expect, it } from 'vitest'
import { TestCharacterContextResolver } from './test-character-context-resolver'

const ownerId = new UserId('11111111-1111-4111-8111-111111111111')

function setup() {
  const first = Lorebook.create('角色绑定', '', ownerId)
  const firstDraft = first.draftRevision
  if (!firstDraft) throw new Error('missing draft')
  first.replaceRevisionEntries(firstDraft.id, [
    LorebookEntry.create(['forest'], 'Forest', true, '角色绑定内容', 'before_history', 0),
  ])
  first.publishRevision(firstDraft.id)

  const second = Lorebook.create('测试附加', '', ownerId)
  const secondDraft = second.draftRevision
  if (!secondDraft) throw new Error('missing draft')
  second.replaceRevisionEntries(secondDraft.id, [
    LorebookEntry.create(['moon'], 'Moon', true, '测试附加内容', 'after_history', 0),
  ])
  second.publishRevision(secondDraft.id)

  const character = Character.create({
    ownerId,
    initialRevision: {
      name: 'Kirika',
      greetings: ['你好'],
      lorebooks: [
        new CharacterLorebookReference({
          lorebookRevisionId: firstDraft.id,
          ordinal: 0,
          enabled: true,
        }),
      ],
    },
  })
  const runtime = {
    characterRepository: { findById: async () => character },
    lorebookRepository: { findAll: async () => [first, second] },
  } as never
  return { character, firstDraft, secondDraft, runtime }
}

describe('TestCharacterContextResolver', () => {
  it('uses only explicitly selected lorebooks when character bindings are disabled', async () => {
    const { character, secondDraft, runtime } = setup()
    const resolver = new TestCharacterContextResolver(runtime, {
      includeCharacterLorebooks: false,
      lorebookRevisionIds: [secondDraft.id.value],
    })
    const resolved = await resolver.resolve(
      character.id,
      character.draftRevision?.id as CharacterRevisionId,
    )
    expect(resolved?.lorebooks.map((item) => item.id.value)).toEqual([secondDraft.id.value])
    expect(resolved?.revision.lorebooks.map((item) => item.lorebookRevisionId.value)).toEqual([
      secondDraft.id.value,
    ])
  })

  it('merges character bindings with selected versions and rejects missing versions', async () => {
    const { character, firstDraft, secondDraft, runtime } = setup()
    const resolver = new TestCharacterContextResolver(runtime, {
      includeCharacterLorebooks: true,
      lorebookRevisionIds: [firstDraft.id.value, secondDraft.id.value],
    })
    const resolved = await resolver.resolve(
      character.id,
      character.draftRevision?.id as CharacterRevisionId,
    )
    expect(resolved?.lorebooks.map((item) => item.id.value)).toEqual([
      firstDraft.id.value,
      secondDraft.id.value,
    ])
    await expect(
      new TestCharacterContextResolver(runtime, {
        includeCharacterLorebooks: false,
        lorebookRevisionIds: ['99999999-9999-4999-8999-999999999999'],
      }).resolve(character.id, character.draftRevision?.id as CharacterRevisionId),
    ).rejects.toThrow('测试世界书版本不存在')
  })
})
