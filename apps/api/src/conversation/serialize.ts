import type {
  Conversation,
  ConversationMessage,
} from '@kirika-js/core/domain/conversation'

export function conversationToJson(conversation: Conversation) {
  return {
    id: conversation.id.value,
    ownerId: conversation.ownerId.value,
    title: conversation.title,
    mode: conversation.mode,
    status: conversation.status,
    turnPolicy: conversation.turnPolicy,
    activeLeafMessageId: conversation.activeLeafMessageId?.value ?? null,
    participants: conversation.participants.map((participant) => ({
      id: participant.id.value,
      type: participant.type,
      role: participant.role,
      status: participant.status,
      userId: participant.userId?.value ?? null,
      characterId: participant.characterId?.value ?? null,
      characterRevisionId: participant.characterRevisionId?.value ?? null,
      displayName: participant.displayName,
      joinedAt: participant.joinedAt,
      leftAt: participant.leftAt,
    })),
    createdAt: conversation.createdAt,
    updatedAt: conversation.updatedAt,
  }
}

export function messageToJson(message: ConversationMessage) {
  return {
    id: message.id.value,
    conversationId: message.conversationId.value,
    parentMessageId: message.parentMessageId?.value ?? null,
    authorParticipantId: message.authorParticipantId.value,
    source: message.source,
    status: message.status,
    content: message.content.parts.map((part) =>
      part.type === 'text'
        ? { type: 'text', text: part.text }
        : {
            type: 'asset',
            assetId: part.assetId.value,
            modality: part.modality,
            mediaType: part.mediaType,
            altText: part.altText,
          },
    ),
    model: message.model,
    finishReason: message.finishReason,
    tokenUsage: message.tokenUsage
      ? {
          promptTokens: message.tokenUsage.promptTokens,
          completionTokens: message.tokenUsage.completionTokens,
        }
      : null,
    createdAt: message.createdAt,
    updatedAt: message.updatedAt,
  }
}
