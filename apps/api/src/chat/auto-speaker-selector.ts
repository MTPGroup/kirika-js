import type {
  AutoSpeakerSelectionInput,
  AutoSpeakerSelectorPort,
  ChatModelPort,
  ChatModelRequest,
} from '@kirika-js/core/chat'
import type {
  ConversationParticipant,
  ConversationParticipantId,
} from '@kirika-js/core/domain/conversation'

const MAX_HISTORY_MESSAGES = 12

export class LlmAutoSpeakerSelector implements AutoSpeakerSelectorPort {
  constructor(
    private readonly model: ChatModelPort,
    private readonly defaultModel: string,
  ) {}

  async selectSpeaker(
    input: AutoSpeakerSelectionInput,
  ): Promise<ConversationParticipantId> {
    const candidates = input.candidates
    const request = buildRequest(input, this.defaultModel)

    const response = await collectResponse(this.model, request)
    const selected = resolveCandidate(candidates, response)

    return selected?.id ?? fallbackCandidate(candidates, input).id
  }
}

function buildRequest(
  input: AutoSpeakerSelectionInput,
  defaultModel: string,
): ChatModelRequest {
  const candidates = input.candidates
  const candidateLines = candidates
    .map((candidate, index) => `${index + 1}. ${candidate.displayName}`)
    .join('\n')

  return {
    model: defaultModel,
    messages: [
      {
        role: 'system',
        content: [
          {
            type: 'text',
            text:
              '你是群聊的主持人。根据最近对话内容，判断下一位最自然接话的角色。' +
              '只输出候选角色的名字，不要输出任何其他内容。',
          },
        ],
      },
      {
        role: 'user',
        content: [
          {
            type: 'text',
            text: `候选角色：\n${candidateLines}\n\n最近对话：\n${historyToText(input)}`,
          },
        ],
      },
    ],
  }
}

function historyToText(input: AutoSpeakerSelectionInput): string {
  if (input.history.length === 0) return '（暂无对话）'

  return input.history
    .slice(-MAX_HISTORY_MESSAGES)
    .map((message) => {
      const author = input.conversation.findParticipant(
        message.authorParticipantId,
      )?.displayName
      const text = message.content.parts
        .map((part) =>
          part.type === 'text' ? part.text : (part.altText ?? ''),
        )
        .join('')
        .trim()
      return `${author ?? '未知'}: ${text || '…'}`
    })
    .join('\n')
}

async function collectResponse(
  model: ChatModelPort,
  request: ChatModelRequest,
): Promise<string> {
  let text = ''
  for await (const event of model.generate(request)) {
    if (event.type === 'text_delta') {
      text += event.delta
    } else if (event.type === 'finish') {
      break
    }
  }
  return text.trim()
}

function resolveCandidate(
  candidates: readonly ConversationParticipant[],
  response: string,
): ConversationParticipant | null {
  if (!response) return null

  for (const candidate of candidates) {
    if (candidate.displayName === response) return candidate
  }
  for (const candidate of candidates) {
    if (response.includes(candidate.displayName)) return candidate
  }
  const indexMatch = /^\s*(\d+)\s*$/.exec(response)
  if (indexMatch) {
    const index = Number.parseInt(indexMatch[1] ?? '', 10) - 1
    return candidates[index] ?? null
  }

  return null
}

function fallbackCandidate(
  candidates: readonly ConversationParticipant[],
  input: AutoSpeakerSelectionInput,
): ConversationParticipant {
  for (let index = input.history.length - 1; index >= 0; index -= 1) {
    const authorId = input.history[index]?.authorParticipantId
    const previousIndex = candidates.findIndex((candidate) =>
      candidate.id.equals(authorId),
    )
    if (previousIndex >= 0) {
      return candidates[(previousIndex + 1) % candidates.length]
    }
  }

  return candidates[0]
}
