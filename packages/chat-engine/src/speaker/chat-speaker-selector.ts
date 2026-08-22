import type {
  Conversation,
  ConversationMessage,
  ConversationParticipant,
  ConversationParticipantId,
} from '@kirika-js/domain/conversation'
import { ChatSpeakerSelectionError } from '../errors'
import type { AutoSpeakerSelectorPort } from '../ports/speaker-selector.port'

export interface SelectChatSpeakerInput {
  readonly conversation: Conversation
  readonly history: readonly ConversationMessage[]
  readonly requestedSpeakerId?: ConversationParticipantId
}

export class ChatSpeakerSelector {
  constructor(private readonly autoSelector?: AutoSpeakerSelectorPort) {}

  async select(
    input: SelectChatSpeakerInput,
  ): Promise<ConversationParticipant> {
    const candidates = input.conversation.activeParticipants.filter(
      (participant) => participant.type === 'character',
    )
    if (candidates.length === 0) {
      throw new ChatSpeakerSelectionError('会话中没有可以发言的活跃角色')
    }

    if (input.requestedSpeakerId) {
      return requireCandidate(candidates, input.requestedSpeakerId)
    }
    if (candidates.length === 1) return candidates[0]

    switch (input.conversation.turnPolicy) {
      case 'manual':
        throw new ChatSpeakerSelectionError('手动发言策略必须指定角色参与者')
      case 'round_robin':
        return selectRoundRobin(candidates, input.history)
      case 'auto': {
        if (!this.autoSelector) {
          throw new ChatSpeakerSelectionError(
            '自动发言策略需要 AutoSpeakerSelectorPort',
          )
        }
        const selectedId = await this.autoSelector.selectSpeaker({
          conversation: input.conversation,
          history: input.history,
          candidates,
        })
        return requireCandidate(candidates, selectedId)
      }
    }
  }
}

function selectRoundRobin(
  candidates: readonly ConversationParticipant[],
  history: readonly ConversationMessage[],
): ConversationParticipant {
  for (let index = history.length - 1; index >= 0; index -= 1) {
    const authorId = history[index]?.authorParticipantId
    const previousIndex = candidates.findIndex((candidate) =>
      candidate.id.equals(authorId),
    )
    if (previousIndex >= 0) {
      return candidates[(previousIndex + 1) % candidates.length]
    }
  }

  return candidates[0]
}

function requireCandidate(
  candidates: readonly ConversationParticipant[],
  participantId: ConversationParticipantId,
): ConversationParticipant {
  const selected = candidates.find((candidate) =>
    candidate.id.equals(participantId),
  )
  if (!selected) {
    throw new ChatSpeakerSelectionError(
      `发言者不是会话中的活跃角色: ${participantId.value}`,
    )
  }
  return selected
}
