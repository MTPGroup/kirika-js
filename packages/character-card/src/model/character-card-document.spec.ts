import { describe, expect, it } from 'vitest'
import {
  createCharacterCardDocument,
  InvalidCharacterCardError,
} from '../index'

describe('CharacterCardDocument', () => {
  it('规范化角色卡字段并与调用方数据隔离', () => {
    const bytes = new Uint8Array([1, 2, 3])
    const extensions = { nested: { enabled: true } }
    const card = createCharacterCardDocument({
      name: '  露娜  ',
      greetings: ['你好。', '', '你好。'],
      examples: ['示例'],
      extensions,
      assets: [
        {
          kind: 'avatar',
          name: '  main  ',
          ordinal: 0,
          mediaType: ' image/png ',
          data: bytes,
        },
      ],
    })

    bytes[0] = 9
    extensions.nested.enabled = false

    expect(card).toMatchObject({
      modelVersion: 1,
      name: '露娜',
      description: '',
      greetings: ['你好。'],
      examples: ['示例'],
      extensions: { nested: { enabled: true } },
    })
    expect(card.assets[0]).toMatchObject({
      kind: 'avatar',
      name: 'main',
      ordinal: 0,
      mediaType: 'image/png',
    })
    expect(card.assets[0]?.data).toEqual(new Uint8Array([1, 2, 3]))
  })

  it('拒绝无法进入规范化模型的数据', () => {
    expect(() => createCharacterCardDocument({ name: '   ' })).toThrow(
      InvalidCharacterCardError,
    )
    expect(() =>
      createCharacterCardDocument({
        name: '露娜',
        assets: [
          { kind: 'avatar', name: 'a', ordinal: 0, uri: 'asset://a' },
          { kind: 'avatar', name: 'b', ordinal: 0, uri: 'asset://b' },
        ],
      }),
    ).toThrow('角色卡资产位置重复: avatar:0')
    expect(() =>
      createCharacterCardDocument({
        name: '露娜',
        lorebooks: [
          {
            ordinal: 0,
            entries: [
              {
                keys: [],
                title: '月之魔法',
                content: '设定',
                position: 'before_history',
              },
            ],
          },
        ],
      }),
    ).toThrow('角色卡世界书条目至少需要一个关键词')
  })
})
