import {
  AssetId,
  CharacterLorebookReference,
  CharacterRevision,
  CharacterRevisionAsset,
} from '@kirika-js/domain/character'
import { LorebookRevisionId } from '@kirika-js/domain/lorebook'
import { describe, expect, it, vi } from 'vitest'
import {
  CharacterCardResourceMappingError,
  fromCharacterRevision,
  toCharacterRevisionContent,
} from '../index'

function createAsset() {
  return new CharacterRevisionAsset({
    assetId: new AssetId(crypto.randomUUID()),
    kind: 'avatar',
    name: 'main',
    uri: 'asset://avatar',
    ordinal: 0,
    extensions: { crop: 'center' },
  })
}

function createLorebookReference() {
  return new CharacterLorebookReference({
    lorebookRevisionId: new LorebookRevisionId(crypto.randomUUID()),
    ordinal: 0,
    enabled: false,
  })
}

describe('CharacterCard Domain mapper', () => {
  it('将规范化角色资料映射为 CharacterRevisionContent', async () => {
    const content = await toCharacterRevisionContent({
      name: '露娜',
      description: '月之魔女',
      greetings: ['你好。'],
      extensions: { source: 'test' },
    })

    expect(content).toEqual({
      name: '露娜',
      description: '月之魔女',
      personality: '',
      scenario: '',
      systemPrompt: '',
      postHistoryInstructions: '',
      greetings: ['你好。'],
      examples: [],
      extensions: { source: 'test' },
      assets: [],
      lorebooks: [],
    })
  })

  it('通过上层资源映射器导入资产和世界书', async () => {
    const asset = createAsset()
    const lorebookReference = createLorebookReference()
    const importAsset = vi.fn(() => ({
      assetId: asset.assetId,
      uri: asset.uri,
      extensions: asset.extensions,
    }))
    const importLorebook = vi.fn(() => lorebookReference.lorebookRevisionId)

    const content = await toCharacterRevisionContent(
      {
        name: '露娜',
        assets: [
          {
            kind: 'avatar',
            name: 'main',
            ordinal: 0,
            data: new Uint8Array([1]),
          },
        ],
        lorebooks: [
          {
            ordinal: 0,
            entries: [
              {
                keys: ['月亮'],
                title: '月之魔法',
                content: '露娜使用月之魔法。',
                position: 'before_history',
              },
            ],
          },
        ],
      },
      { importAsset, importLorebook },
    )

    expect(importAsset).toHaveBeenCalledOnce()
    expect(importLorebook).toHaveBeenCalledOnce()
    expect(content.assets).toHaveLength(1)
    expect(content.assets?.[0]).toMatchObject({
      assetId: asset.assetId,
      kind: 'avatar',
      name: 'main',
      ordinal: 0,
      uri: asset.uri,
    })
    expect(content.lorebooks).toHaveLength(1)
    expect(content.lorebooks?.[0]).toMatchObject({
      lorebookRevisionId: lorebookReference.lorebookRevisionId,
      ordinal: 0,
      enabled: true,
    })
  })

  it('存在可移植资源却没有映射器时拒绝静默丢弃', async () => {
    await expect(
      toCharacterRevisionContent({
        name: '露娜',
        assets: [
          {
            kind: 'avatar',
            name: 'main',
            ordinal: 0,
            uri: 'https://example.com/avatar.png',
          },
        ],
      }),
    ).rejects.toBeInstanceOf(CharacterCardResourceMappingError)
  })

  it('从角色版本导出资料，并由上层解析世界书内容', async () => {
    const asset = createAsset()
    const lorebookReference = createLorebookReference()
    const revision = CharacterRevision.createDraft(1, {
      name: '露娜',
      description: '月之魔女',
      greetings: ['你好。'],
      assets: [asset],
      lorebooks: [lorebookReference],
    })

    const card = await fromCharacterRevision(revision, {
      exportLorebook: () => ({
        name: '月之书',
        entries: [
          {
            keys: ['月亮'],
            title: '月之魔法',
            content: '露娜使用月之魔法。',
            position: 'before_history',
          },
        ],
      }),
    })

    expect(card).toMatchObject({
      name: '露娜',
      description: '月之魔女',
      assets: [
        {
          kind: 'avatar',
          name: 'main',
          ordinal: 0,
          uri: 'asset://avatar',
        },
      ],
      lorebooks: [
        {
          ordinal: 0,
          enabled: false,
          name: '月之书',
        },
      ],
    })
  })

  it('导出引用世界书的角色版本时要求资源映射器', async () => {
    const revision = CharacterRevision.createDraft(1, {
      name: '露娜',
      lorebooks: [createLorebookReference()],
    })

    await expect(fromCharacterRevision(revision)).rejects.toBeInstanceOf(
      CharacterCardResourceMappingError,
    )
  })
})
