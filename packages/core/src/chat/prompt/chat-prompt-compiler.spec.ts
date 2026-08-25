import { describe, expect, it } from 'vitest'
import { AssetId, CharacterLorebookReference } from '../../domain/character'
import { MessageContent } from '../../domain/conversation'
import {
  LorebookEntry,
  LorebookRevision,
  LorebookRevisionId,
} from '../../domain/lorebook'
import { ChatCharacterContextNotFoundError } from '../errors'
import {
  createDirectFixture,
  createRevisionFor,
  text,
} from '../testing/fixtures'
import { ChatPromptCompiler } from './chat-prompt-compiler'

describe('ChatPromptCompiler', () => {
  it('编译角色资料、宏、消息分支、多模态内容和世界书位置', () => {
    const { conversation, owner, character } = createDirectFixture()
    const lorebookId = new LorebookRevisionId(crypto.randomUUID())
    const revision = createRevisionFor(character, {
      name: 'Luna',
      description: '{{char}} 是月之魔女',
      personality: '冷静',
      scenario: '与 {{user}} 一同旅行',
      systemPrompt:
        '{{original}}\nRespond as {{char}} / {{speaker}} / {{mood}}.',
      postHistoryInstructions: 'Reply to {{user}}.',
      greetings: ['你好，{{user}}。'],
      examples: ['{{user}}: 月亮？\n{{char}}: 是的。'],
      lorebooks: [
        new CharacterLorebookReference({
          lorebookRevisionId: lorebookId,
          ordinal: 0,
          enabled: true,
        }),
      ],
    })
    const lorebook = LorebookRevision.reconstitute(lorebookId, 1, false, [
      LorebookEntry.create(
        ['月亮'],
        '月之国度',
        true,
        '{{char}} 来自月之国度。',
        'before_history',
        100,
      ),
      LorebookEntry.create(
        ['画像'],
        '秘密画像',
        true,
        '画像属于 {{user}}。',
        'after_history',
        50,
      ),
    ])
    const greeting = conversation.createGreetingMessage(
      character.id,
      text('你好，{{user}}。'),
      null,
    )
    const userMessage = conversation.createHumanMessage(
      owner.id,
      MessageContent.create([
        { type: 'text', text: '谈谈月亮。' },
        {
          type: 'asset',
          assetId: new AssetId(crypto.randomUUID()),
          modality: 'image',
          mediaType: 'image/png',
          altText: '一幅秘密画像',
        },
      ]),
      greeting,
    )

    const messages = new ChatPromptCompiler().compile({
      conversation,
      history: [greeting, userMessage],
      speaker: character,
      character: { revision, lorebooks: [lorebook] },
      defaultSystemPrompt: 'Default prompt for {{user}}.',
      extraMacros: { mood: 'calm' },
    })

    expect(messages).toHaveLength(4)
    expect(messages[0]).toMatchObject({ role: 'system' })
    expect(messages[0]?.content[0]).toMatchObject({
      type: 'text',
      text: expect.stringContaining('Default prompt for Hana.'),
    })
    const beforeText = messages[0]?.content[0]
    expect(beforeText?.type === 'text' ? beforeText.text : '').toContain(
      'Respond as Luna / Luna Alias / calm.',
    )
    expect(beforeText?.type === 'text' ? beforeText.text : '').toContain(
      'Luna 来自月之国度。',
    )
    expect(messages[1]).toMatchObject({
      role: 'assistant',
      name: 'Luna Alias',
      content: [{ type: 'text', text: '你好，Hana。' }],
    })
    expect(messages[2]).toMatchObject({ role: 'user', name: 'Hana' })
    expect(messages[2]?.content[1]).toMatchObject({
      type: 'asset',
      modality: 'image',
      mediaType: 'image/png',
    })
    const afterText = messages[3]?.content[0]
    expect(afterText?.type === 'text' ? afterText.text : '').toContain(
      '画像属于 Hana。',
    )
    expect(afterText?.type === 'text' ? afterText.text : '').toContain(
      'Reply to Hana.',
    )
  })

  it('独立应用扫描深度、预算并钳制超长插入深度', () => {
    const { conversation, owner, character } = createDirectFixture()
    const shallowId = new LorebookRevisionId(crypto.randomUUID())
    const deepId = new LorebookRevisionId(crypto.randomUUID())
    const revision = createRevisionFor(character, {
      name: 'Luna',
      lorebooks: [
        new CharacterLorebookReference({
          lorebookRevisionId: shallowId,
          ordinal: 0,
          enabled: true,
        }),
        new CharacterLorebookReference({
          lorebookRevisionId: deepId,
          ordinal: 1,
          enabled: true,
        }),
      ],
    })
    const shallow = LorebookRevision.reconstitute(
      shallowId,
      1,
      false,
      [
        LorebookEntry.create(
          ['古老关键词'],
          '不应触发',
          true,
          '浅层错误内容',
          'before_history',
          100,
        ),
      ],
      { scanDepth: 1, tokenBudget: 100 },
    )
    const deep = LorebookRevision.reconstitute(
      deepId,
      1,
      false,
      [
        LorebookEntry.create(
          ['古老关键词'],
          '深层命中',
          true,
          '深层正确内容',
          'at_depth',
          100,
          { insertionDepth: 99 },
        ),
        LorebookEntry.create(
          [],
          '超预算',
          true,
          'x'.repeat(500),
          'after_history',
          10,
          { constant: true },
        ),
      ],
      { scanDepth: 2, tokenBudget: 20 },
    )
    const oldMessage = conversation.createHumanMessage(
      owner.id,
      text('古老关键词'),
      null,
    )
    const recentMessage = conversation.createHumanMessage(
      owner.id,
      text('最近消息'),
      oldMessage,
    )

    const messages = new ChatPromptCompiler().compile({
      conversation,
      history: [oldMessage, recentMessage],
      speaker: character,
      character: { revision, lorebooks: [shallow, deep] },
    })
    const texts = messages
      .flatMap((message) => message.content)
      .filter((part) => part.type === 'text')
      .map((part) => part.text)

    expect(texts.join('\n')).not.toContain('浅层错误内容')
    expect(texts.join('\n')).toContain('深层正确内容')
    expect(texts.join('\n')).not.toContain('x'.repeat(500))
    expect(messages[1]?.content[0]).toMatchObject({
      type: 'text',
      text: expect.stringContaining('深层正确内容'),
    })
  })

  it('群聊提示词明确当前发言者和参与者', () => {
    const direct = createDirectFixture()
    direct.conversation.convertToGroup('manual')
    const revision = createRevisionFor(direct.character, { name: 'Luna' })

    const messages = new ChatPromptCompiler().compile({
      conversation: direct.conversation,
      history: [],
      speaker: direct.character,
      character: { revision, lorebooks: [] },
    })
    const systemPart = messages[0]?.content[0]
    const systemText = systemPart?.type === 'text' ? systemPart.text : ''

    expect(systemText).toContain('[Group Conversation]')
    expect(systemText).toContain('Current speaker: Luna Alias')
    expect(systemText).toContain('- Hana (human)')
  })

  it('拒绝缺失世界书或与参与者不一致的角色版本', () => {
    const { conversation, character } = createDirectFixture()
    const lorebookId = new LorebookRevisionId(crypto.randomUUID())
    const revision = createRevisionFor(character, {
      name: 'Luna',
      lorebooks: [
        new CharacterLorebookReference({
          lorebookRevisionId: lorebookId,
          ordinal: 0,
          enabled: true,
        }),
      ],
    })

    expect(() =>
      new ChatPromptCompiler().compile({
        conversation,
        history: [],
        speaker: character,
        character: { revision, lorebooks: [] },
      }),
    ).toThrow('未解析角色引用的世界书版本')

    const other = createDirectFixture()
    const otherRevision = createRevisionFor(other.character)
    expect(() =>
      new ChatPromptCompiler().compile({
        conversation,
        history: [],
        speaker: character,
        character: { revision: otherRevision, lorebooks: [] },
      }),
    ).toThrow(ChatCharacterContextNotFoundError)
  })
})
