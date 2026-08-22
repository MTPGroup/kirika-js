import type {
  Conversation,
  ConversationMessage,
} from '@kirika-js/domain/conversation'
import { InvalidChatHistoryError } from './errors'

export function validateChatHistory(
  conversation: Conversation,
  history: readonly ConversationMessage[],
): void {
  const ids = new Set<string>()

  for (const [index, message] of history.entries()) {
    if (!message.conversationId.equals(conversation.id)) {
      throw new InvalidChatHistoryError('聊天历史包含其他会话的消息')
    }
    if (message.status !== 'completed') {
      throw new InvalidChatHistoryError('聊天历史只能包含已完成消息')
    }
    if (!conversation.findParticipant(message.authorParticipantId)) {
      throw new InvalidChatHistoryError(
        `聊天历史包含未知参与者的消息: ${message.authorParticipantId.value}`,
      )
    }
    if (ids.has(message.id.value)) {
      throw new InvalidChatHistoryError(`聊天历史消息重复: ${message.id.value}`)
    }
    ids.add(message.id.value)

    const parent = history[index - 1]
    if (index === 0 && message.parentMessageId !== null) {
      throw new InvalidChatHistoryError('聊天历史必须从根消息开始')
    }
    if (index > 0 && !message.parentMessageId?.equals(parent?.id)) {
      throw new InvalidChatHistoryError('聊天历史不是一条连续的消息分支')
    }
  }
}
