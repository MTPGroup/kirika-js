import { describe, expect, it } from 'vitest'
import { AssetId } from '../../character/entities/assets.entity'
import { CharacterId } from '../../character/entities/character.entity'
import { CharacterRevisionId } from '../../character/entities/character-revision.entity'
import { UserId } from '../../shared/user-id.vo'
import { Conversation, ConversationId } from './conversation.entity'
import { ConversationMessage } from './conversation-message.entity'
import { ConversationParticipant } from './conversation-participant.entity'
import { MessageContent } from './message-content.vo'
import { TokenUsage } from './token-usage.vo'

const ownerId = new UserId('11111111-1111-4111-8111-111111111111')
const secondUserId = new UserId('22222222-2222-4222-8222-222222222222')
const kirikaId = new CharacterId('33333333-3333-4333-8333-333333333333')
const kirikaRevisionId = new CharacterRevisionId(
  '44444444-4444-4444-8444-444444444444',
)
const aliceId = new CharacterId('55555555-5555-4555-8555-555555555555')
const aliceRevisionId = new CharacterRevisionId(
  '66666666-6666-4666-8666-666666666666',
)
const imageAssetId = new AssetId('88888888-8888-4888-8888-888888888888')

function text(value: string) {
  return MessageContent.fromText(value)
}

function createOwnerParticipant() {
  return ConversationParticipant.createHuman({
    userId: ownerId,
    displayName: 'Owner',
    role: 'owner',
  })
}

function createKirikaParticipant() {
  return ConversationParticipant.createCharacter({
    characterId: kirikaId,
    characterRevisionId: kirikaRevisionId,
    displayName: 'Kirika',
  })
}

function createAliceParticipant() {
  return ConversationParticipant.createCharacter({
    characterId: aliceId,
    characterRevisionId: aliceRevisionId,
    displayName: 'Alice',
  })
}

function createDirectConversation() {
  const owner = createOwnerParticipant()
  const kirika = createKirikaParticipant()
  const conversation = Conversation.create({
    ownerId,
    mode: 'direct',
    participants: [owner, kirika],
    title: ' Kirika Chat ',
  })

  return { conversation, owner, kirika }
}

describe('Conversation', () => {
  it('创建固定角色版本的一对一会话', () => {
    const { conversation, owner, kirika } = createDirectConversation()

    expect(conversation.id.value).toEqual(expect.any(String))
    expect(conversation.ownerId).toEqual(ownerId)
    expect(conversation.mode).toBe('direct')
    expect(conversation.title).toBe('Kirika Chat')
    expect(conversation.status).toBe('active')
    expect(conversation.turnPolicy).toBe('manual')
    expect(conversation.participants).toHaveLength(2)
    expect(owner).toMatchObject({ type: 'human', role: 'owner' })
    expect(kirika).toMatchObject({
      type: 'character',
      characterId: kirikaId,
      characterRevisionId: kirikaRevisionId,
    })
  })

  it('将一对一会话转换为群聊并增加角色和人类成员', () => {
    const { conversation } = createDirectConversation()
    const alice = createAliceParticipant()
    const secondHuman = ConversationParticipant.createHuman({
      userId: secondUserId,
      displayName: 'Second User',
    })

    expect(() => conversation.addParticipant(alice)).toThrow(
      '一对一会话需要先转换为群聊才能增加参与者',
    )

    conversation.convertToGroup('round_robin')
    conversation.addParticipant(alice)
    conversation.addParticipant(secondHuman)

    expect(conversation.mode).toBe('group')
    expect(conversation.turnPolicy).toBe('round_robin')
    expect(conversation.activeParticipants).toHaveLength(4)
  })

  it('创建角色问候、人工消息并完成流式生成', () => {
    const { conversation, owner, kirika } = createDirectConversation()
    const greeting = conversation.createGreetingMessage(
      kirika.id,
      text('你好，我是 Kirika。'),
      null,
    )
    const userMessage = conversation.createHumanMessage(
      owner.id,
      text('你好'),
      greeting,
    )
    const generated = conversation.createGeneratedMessage(
      kirika.id,
      'gpt-test',
      userMessage,
    )

    expect(conversation.activeGenerationMessageId).toEqual(generated.id)
    expect(conversation.activeLeafMessageId).toEqual(generated.id)
    expect(generated).toMatchObject({
      conversationId: conversation.id,
      parentMessageId: userMessage.id,
      authorParticipantId: kirika.id,
      source: 'generated',
      status: 'pending',
    })

    conversation.appendGeneratedTextDelta(generated, '你')
    conversation.appendGeneratedTextDelta(generated, '好！')
    conversation.completeGeneratedMessage(
      generated,
      'stop',
      new TokenUsage({ promptTokens: 12, completionTokens: 3 }),
    )

    expect(generated).toMatchObject({
      status: 'completed',
      model: 'gpt-test',
      finishReason: 'stop',
    })
    expect(generated.content.text).toBe('你好！')
    expect(generated.tokenUsage?.totalTokens).toBe(15)
    expect(conversation.activeGenerationMessageId).toBeNull()
  })

  it('群聊允许多个角色连续发言', () => {
    const { conversation, kirika } = createDirectConversation()
    const alice = createAliceParticipant()
    conversation.convertToGroup('auto')
    conversation.addParticipant(alice)

    const kirikaGreeting = conversation.createGreetingMessage(
      kirika.id,
      text('大家好。'),
      null,
    )
    const aliceMessage = conversation.createGeneratedMessage(
      alice.id,
      'model-alice',
      kirikaGreeting,
    )
    conversation.appendGeneratedTextDelta(aliceMessage, '你好，Kirika。')
    conversation.completeGeneratedMessage(aliceMessage, 'stop')

    const kirikaReply = conversation.createGeneratedMessage(
      kirika.id,
      'model-kirika',
      aliceMessage,
    )
    conversation.appendGeneratedTextDelta(kirikaReply, '你好，Alice。')
    conversation.completeGeneratedMessage(kirikaReply, 'stop')

    expect(aliceMessage.authorParticipantId).toEqual(alice.id)
    expect(kirikaReply.authorParticipantId).toEqual(kirika.id)
    expect(kirikaReply.parentMessageId).toEqual(aliceMessage.id)
    expect(conversation.activeLeafMessageId).toEqual(kirikaReply.id)
  })

  it('基于同一消息重新生成并切换活跃分支', () => {
    const { conversation, owner, kirika } = createDirectConversation()
    const userMessage = conversation.createHumanMessage(
      owner.id,
      text('你好'),
      null,
    )
    const firstResponse = conversation.createGeneratedMessage(
      kirika.id,
      'model-v1',
      userMessage,
    )
    conversation.appendGeneratedTextDelta(firstResponse, '第一版回答')
    conversation.completeGeneratedMessage(firstResponse, 'stop')

    const regenerated = conversation.createGeneratedMessage(
      kirika.id,
      'model-v2',
      userMessage,
    )
    conversation.appendGeneratedTextDelta(regenerated, '第二版回答')
    conversation.completeGeneratedMessage(regenerated, 'stop')

    expect(firstResponse.parentMessageId).toEqual(userMessage.id)
    expect(regenerated.parentMessageId).toEqual(userMessage.id)
    expect(conversation.activeLeafMessageId).toEqual(regenerated.id)

    conversation.selectMessageBranch(firstResponse, false)
    expect(conversation.activeLeafMessageId).toEqual(firstResponse.id)
    expect(() => conversation.selectMessageBranch(userMessage, true)).toThrow(
      '只能选择没有后续消息的叶子消息',
    )
  })

  it('使用会话级生成锁阻止并发生成和归档', () => {
    const { conversation, owner, kirika } = createDirectConversation()
    const userMessage = conversation.createHumanMessage(
      owner.id,
      text('你好'),
      null,
    )
    const generated = conversation.createGeneratedMessage(
      kirika.id,
      'model-v1',
      userMessage,
    )

    expect(() =>
      conversation.createGeneratedMessage(kirika.id, 'model-v2', userMessage),
    ).toThrow('会话中已有正在生成的消息')
    expect(() => conversation.convertToGroup()).toThrow(
      '会话中已有正在生成的消息',
    )
    expect(() => conversation.archive()).toThrow('会话中已有正在生成的消息')

    conversation.failGeneratedMessage(generated, '上游服务不可用')
    expect(generated).toMatchObject({
      status: 'failed',
      finishReason: 'error',
      errorReason: '上游服务不可用',
    })
    expect(conversation.activeGenerationMessageId).toBeNull()

    const retried = conversation.createGeneratedMessage(
      kirika.id,
      'model-v2',
      userMessage,
    )
    expect(retried.status).toBe('pending')
  })

  it('取消生成后释放会话生成锁并允许重试', () => {
    const { conversation, owner, kirika } = createDirectConversation()
    const userMessage = conversation.createHumanMessage(
      owner.id,
      text('你好'),
      null,
    )
    const generated = conversation.createGeneratedMessage(
      kirika.id,
      'model-v1',
      userMessage,
    )

    conversation.cancelGeneratedMessage(generated)

    expect(generated).toMatchObject({
      status: 'cancelled',
      finishReason: 'cancelled',
      errorReason: null,
    })
    expect(conversation.activeGenerationMessageId).toBeNull()
    expect(() =>
      conversation.createGeneratedMessage(kirika.id, 'model-v2', userMessage),
    ).not.toThrow()
  })

  it('拒绝空白人工消息且不改变活跃分支', () => {
    const { conversation, owner } = createDirectConversation()

    expect(() =>
      conversation.createHumanMessage(owner.id, MessageContent.empty(), null),
    ).toThrow('消息内容不能为空')
    expect(() =>
      conversation.createHumanMessage(owner.id, text('   '), null),
    ).toThrow('消息内容不能为空')
    expect(conversation.activeLeafMessageId).toBeNull()
  })

  it('参与者退出后不能发言且所有者不能退出', () => {
    const { conversation, owner } = createDirectConversation()
    const secondHuman = ConversationParticipant.createHuman({
      userId: secondUserId,
      displayName: 'Second User',
    })
    conversation.convertToGroup()
    conversation.addParticipant(secondHuman)
    conversation.removeParticipant(secondHuman.id)

    expect(secondHuman.status).toBe('left')
    expect(secondHuman.leftAt).toBeInstanceOf(Date)
    expect(() =>
      conversation.createHumanMessage(secondHuman.id, text('消息'), null),
    ).toThrow('已退出的参与者不能发送消息')
    expect(() => conversation.removeParticipant(owner.id)).toThrow(
      '会话所有者不能退出会话',
    )
  })

  it('拒绝无效的一对一参与者组成和错误所有者', () => {
    const owner = createOwnerParticipant()
    const secondHuman = ConversationParticipant.createHuman({
      userId: secondUserId,
      displayName: 'Second User',
    })

    expect(() =>
      Conversation.create({
        ownerId,
        mode: 'direct',
        participants: [owner, secondHuman],
      }),
    ).toThrow('会话至少需要一个角色参与者')

    expect(() =>
      Conversation.create({
        ownerId: secondUserId,
        mode: 'direct',
        participants: [owner, createKirikaParticipant()],
      }),
    ).toThrow('会话所有者必须是对应的活跃人类参与者')
  })

  it('归档后禁止继续聊天，恢复后允许创建消息', () => {
    const { conversation, owner } = createDirectConversation()
    conversation.archive()

    expect(conversation.status).toBe('archived')
    expect(conversation.archivedAt).toBeInstanceOf(Date)
    expect(() =>
      conversation.createHumanMessage(owner.id, text('你好'), null),
    ).toThrow('已归档的会话不能继续聊天')

    conversation.restore()
    const message = conversation.createHumanMessage(
      owner.id,
      text('你好'),
      null,
    )
    expect(conversation.status).toBe('active')
    expect(conversation.archivedAt).toBeNull()
    expect(message.source).toBe('human')
  })

  it('拒绝操作其他会话的消息', () => {
    const first = createDirectConversation()
    const second = createDirectConversation()
    const foreignMessage = first.conversation.createHumanMessage(
      first.owner.id,
      text('其他会话消息'),
      null,
    )

    expect(() =>
      second.conversation.createGeneratedMessage(
        second.kirika.id,
        'model-v1',
        foreignMessage,
      ),
    ).toThrow('消息不属于当前会话')
  })
})

describe('ConversationParticipant', () => {
  it('角色参与者固定角色版本且不能成为所有者', () => {
    const participant = createKirikaParticipant()
    expect(participant.referenceKey).toBe(`character:${kirikaRevisionId.value}`)
    expect(participant.characterRevisionId).toEqual(kirikaRevisionId)

    const now = new Date()
    expect(() =>
      ConversationParticipant.reconstitute({
        id: participant.id,
        type: 'character',
        role: 'owner',
        status: 'active',
        userId: null,
        characterId: kirikaId,
        characterRevisionId: kirikaRevisionId,
        displayName: 'Kirika',
        joinedAt: now,
        leftAt: null,
      }),
    ).toThrow('角色参与者不能成为会话所有者')
  })
})

describe('ConversationMessage', () => {
  it('生成消息完成后不可继续修改', () => {
    const { conversation, owner, kirika } = createDirectConversation()
    const userMessage = conversation.createHumanMessage(
      owner.id,
      text('你好'),
      null,
    )
    const generated = conversation.createGeneratedMessage(
      kirika.id,
      'model-v1',
      userMessage,
    )
    conversation.appendGeneratedTextDelta(generated, '已完成回答')
    conversation.completeGeneratedMessage(generated, 'stop')

    expect(() => generated.appendTextDelta('额外内容')).toThrow(
      '只有生成中的消息可以执行该操作',
    )
    expect(() => generated.cancel()).toThrow('只有生成中的消息可以执行该操作')
  })

  it('人工消息和问候语不携带模型生成状态', () => {
    const { conversation, owner, kirika } = createDirectConversation()
    const greeting = conversation.createGreetingMessage(
      kirika.id,
      text('你好。'),
      null,
    )
    const human = conversation.createHumanMessage(
      owner.id,
      text('你好'),
      greeting,
    )

    expect(greeting).toMatchObject({
      source: 'greeting',
      status: 'completed',
      model: null,
    })
    expect(human).toMatchObject({
      source: 'human',
      status: 'completed',
      model: null,
    })
  })

  it('支持人工消息同时携带文本和图片', () => {
    const { conversation, owner } = createDirectConversation()
    const content = MessageContent.create([
      { type: 'text', text: '请描述这张图片。' },
      {
        type: 'asset',
        assetId: imageAssetId,
        modality: 'image',
        mediaType: 'image/png',
        altText: '测试图片',
      },
    ])
    const message = conversation.createHumanMessage(owner.id, content, null)

    expect(message.content.text).toBe('请描述这张图片。')
    expect(message.content.parts).toEqual([
      { type: 'text', text: '请描述这张图片。' },
      expect.objectContaining({
        type: 'asset',
        assetId: imageAssetId,
        modality: 'image',
        mediaType: 'image/png',
        altText: '测试图片',
      }),
    ])
  })

  it('支持模型生成仅包含资产的消息', () => {
    const { conversation, owner, kirika } = createDirectConversation()
    const userMessage = conversation.createHumanMessage(
      owner.id,
      text('生成一张图片'),
      null,
    )
    const generated = conversation.createGeneratedMessage(
      kirika.id,
      'image-model',
      userMessage,
    )

    conversation.appendGeneratedContentPart(generated, {
      type: 'asset',
      assetId: imageAssetId,
      modality: 'image',
      mediaType: 'image/webp',
      altText: null,
    })
    conversation.completeGeneratedMessage(generated, 'stop')

    expect(generated.status).toBe('completed')
    expect(generated.content.text).toBe('')
    expect(generated.content.isEmpty).toBe(false)
    expect(generated.content.parts[0]).toMatchObject({
      type: 'asset',
      assetId: imageAssetId,
      modality: 'image',
      mediaType: 'image/webp',
    })
  })
})

describe('MessageContent', () => {
  it('保持内容块顺序并合并连续文本增量', () => {
    const content = MessageContent.empty()
      .appendText('你')
      .appendText('好')
      .appendPart({
        type: 'asset',
        assetId: imageAssetId,
        modality: 'image',
        mediaType: 'IMAGE/PNG',
        altText: '  图片  ',
      })
      .appendText('！')

    expect(content.text).toBe('你好！')
    expect(content.parts).toEqual([
      { type: 'text', text: '你好' },
      expect.objectContaining({
        type: 'asset',
        mediaType: 'image/png',
        altText: '图片',
      }),
      { type: 'text', text: '！' },
    ])
  })

  it('拒绝模态与媒体类型不匹配的资产', () => {
    expect(() =>
      MessageContent.fromAsset({
        assetId: imageAssetId,
        modality: 'image',
        mediaType: 'audio/mpeg',
      }),
    ).toThrow('媒体类型 audio/mpeg 与 image 模态不匹配')
  })
})

describe('TokenUsage', () => {
  it('校验 Token 数量并计算总量', () => {
    const usage = new TokenUsage({ promptTokens: 7, completionTokens: 5 })
    expect(usage.totalTokens).toBe(12)
    expect(
      () => new TokenUsage({ promptTokens: -1, completionTokens: 0 }),
    ).toThrow('输入 Token 数必须是非负安全整数')
  })
})

describe('Conversation reconstitution', () => {
  it('拒绝生成消息不是活跃叶子的会话状态', () => {
    const owner = createOwnerParticipant()
    const kirika = createKirikaParticipant()
    const activeLeafId = ConversationMessage.createHuman({
      conversationId: new ConversationId(
        '77777777-7777-4777-8777-777777777777',
      ),
      parentMessageId: null,
      authorParticipantId: owner.id,
      content: text('你好'),
    }).id
    const generationId = ConversationMessage.createGenerated({
      conversationId: new ConversationId(
        '77777777-7777-4777-8777-777777777777',
      ),
      parentMessageId: activeLeafId,
      authorParticipantId: kirika.id,
      model: 'model-v1',
    }).id
    const now = new Date()

    expect(() =>
      Conversation.reconstitute({
        id: new ConversationId('77777777-7777-4777-8777-777777777777'),
        ownerId,
        mode: 'direct',
        participants: [owner, kirika],
        title: null,
        status: 'active',
        turnPolicy: 'manual',
        activeLeafMessageId: activeLeafId,
        activeGenerationMessageId: generationId,
        createdAt: now,
        updatedAt: now,
        archivedAt: null,
      }),
    ).toThrow('生成中的消息必须是当前活跃消息')
  })

  it('拒绝时间和归档状态不一致的会话', () => {
    const owner = createOwnerParticipant()
    const kirika = createKirikaParticipant()
    const id = new ConversationId('77777777-7777-4777-8777-777777777777')
    const createdAt = new Date('2026-08-21T09:00:00.000Z')
    const earlier = new Date('2026-08-21T08:00:00.000Z')
    const archivedAt = new Date('2026-08-21T10:00:00.000Z')
    const base = {
      id,
      ownerId,
      mode: 'direct' as const,
      participants: [owner, kirika],
      title: null,
      turnPolicy: 'manual' as const,
      activeLeafMessageId: null,
      activeGenerationMessageId: null,
      createdAt,
    }

    expect(() =>
      Conversation.reconstitute({
        ...base,
        status: 'active',
        updatedAt: earlier,
        archivedAt: null,
      }),
    ).toThrow('会话更新时间不能早于创建时间')
    expect(() =>
      Conversation.reconstitute({
        ...base,
        status: 'archived',
        updatedAt: createdAt,
        archivedAt: null,
      }),
    ).toThrow('已归档会话必须记录归档时间')
    expect(() =>
      Conversation.reconstitute({
        ...base,
        status: 'active',
        updatedAt: archivedAt,
        archivedAt,
      }),
    ).toThrow('活跃会话不能包含归档时间')
  })
})
