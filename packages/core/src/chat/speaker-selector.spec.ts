import { describe, expect, it, vi } from 'vitest'
import { ChatSpeakerSelectionError } from './errors'
import { ChatSpeakerSelector } from './speaker-selector'
import {
  createDirectFixture,
  createGroupFixture,
  text,
} from './testing/fixtures'

describe('ChatSpeakerSelector', () => {
  it('一对一会话直接选择唯一活跃角色', async () => {
    const { conversation, character } = createDirectFixture()
    const selected = await new ChatSpeakerSelector().select({
      conversation,
      history: [],
    })

    expect(selected.id).toEqual(character.id)
  })

  it('群聊手动策略要求显式指定角色', async () => {
    const { conversation, secondCharacter } = createGroupFixture('manual')
    const selector = new ChatSpeakerSelector()

    await expect(
      selector.select({ conversation, history: [] }),
    ).rejects.toBeInstanceOf(ChatSpeakerSelectionError)
    await expect(
      selector.select({
        conversation,
        history: [],
        requestedSpeakerId: secondCharacter.id,
      }),
    ).resolves.toBe(secondCharacter)
  })

  it('round_robin 从最近发言角色切换到下一个角色', async () => {
    const { conversation, owner } = createGroupFixture('round_robin')
    const candidates = conversation.activeParticipants.filter(
      (participant) => participant.type === 'character',
    )
    const first = candidates[0]
    const expected = candidates[1]
    const userMessage = conversation.createHumanMessage(
      owner.id,
      text('开始'),
      null,
    )
    const generated = conversation.createGeneratedMessage(
      first.id,
      'test-model',
      userMessage,
    )
    conversation.appendGeneratedTextDelta(generated, '第一位角色发言')
    conversation.completeGeneratedMessage(generated, 'stop')

    const selected = await new ChatSpeakerSelector().select({
      conversation,
      history: [userMessage, generated],
    })

    expect(selected.id).toEqual(expected.id)
  })

  it('auto 委托外部选择器并校验返回值', async () => {
    const { conversation, owner, secondCharacter } = createGroupFixture('auto')
    const selectSpeaker = vi.fn(async () => secondCharacter.id)
    const selector = new ChatSpeakerSelector({ selectSpeaker })

    await expect(selector.select({ conversation, history: [] })).resolves.toBe(
      secondCharacter,
    )
    expect(selectSpeaker).toHaveBeenCalledOnce()

    const invalidSelector = new ChatSpeakerSelector({
      selectSpeaker: async () => owner.id,
    })
    await expect(
      invalidSelector.select({ conversation, history: [] }),
    ).rejects.toThrow('发言者不是会话中的活跃角色')
  })
})
