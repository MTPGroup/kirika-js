/** biome-ignore-all lint/complexity/noStaticOnlyClass: 实例类允许只有静态方法 */
import {
  AssetId,
  CharacterId,
  CharacterRevisionId,
} from '@kirika-js/core/domain/character'
import {
  Conversation,
  ConversationId,
  ConversationMessage,
  ConversationMessageId,
  ConversationParticipant,
  ConversationParticipantId,
  MessageContent,
  TokenUsage,
} from '@kirika-js/core/domain/conversation'
import { UserId } from '@kirika-js/core/domain/shared'
import type {
  conversationMessages,
  conversationParticipants,
  conversations,
  PersistedMessageContentPart,
} from '~/schema/conversation.schema'

type ConversationRow = typeof conversations.$inferSelect

type ParticipantRow = typeof conversationParticipants.$inferSelect

type MessageRow = typeof conversationMessages.$inferSelect

export class ConversationMapper {
  static toDomain(
    raw: ConversationRow,
    participantRows: ParticipantRow[],
  ): Conversation {
    return Conversation.reconstitute({
      id: new ConversationId(raw.id),
      ownerId: new UserId(raw.ownerId),
      mode: raw.mode,
      participants: participantRows.map((participant) =>
        ConversationParticipant.reconstitute({
          id: new ConversationParticipantId(participant.id),
          type: participant.type,
          role: participant.role,
          status: participant.status,
          userId: participant.userId ? new UserId(participant.userId) : null,
          characterId: participant.characterId
            ? new CharacterId(participant.characterId)
            : null,
          characterRevisionId: participant.characterRevisionId
            ? new CharacterRevisionId(participant.characterRevisionId)
            : null,
          displayName: participant.displayName,
          joinedAt: participant.joinedAt,
          leftAt: participant.leftAt,
        }),
      ),
      title: raw.title,
      status: raw.status,
      turnPolicy: raw.turnPolicy,
      activeLeafMessageId: raw.activeLeafMessageId
        ? new ConversationMessageId(raw.activeLeafMessageId)
        : null,
      activeGenerationMessageId: raw.activeGenerationMessageId
        ? new ConversationMessageId(raw.activeGenerationMessageId)
        : null,
      createdAt: raw.createdAt,
      updatedAt: raw.updatedAt,
      archivedAt: raw.archivedAt,
    })
  }

  static toPersistence(conversation: Conversation) {
    return {
      conversation: {
        id: conversation.id.value,
        ownerId: conversation.ownerId.value,
        mode: conversation.mode,
        title: conversation.title,
        status: conversation.status,
        turnPolicy: conversation.turnPolicy,
        activeLeafMessageId: conversation.activeLeafMessageId?.value ?? null,
        activeGenerationMessageId:
          conversation.activeGenerationMessageId?.value ?? null,
        createdAt: conversation.createdAt,
        updatedAt: conversation.updatedAt,
        archivedAt: conversation.archivedAt,
      },

      participants: conversation.participants.map((participant) => ({
        id: participant.id.value,
        conversationId: conversation.id.value,
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
    }
  }

  static messageToDomain(raw: MessageRow): ConversationMessage {
    return ConversationMessage.reconstitute({
      id: new ConversationMessageId(raw.id),
      conversationId: new ConversationId(raw.conversationId),
      parentMessageId: raw.parentMessageId
        ? new ConversationMessageId(raw.parentMessageId)
        : null,
      authorParticipantId: new ConversationParticipantId(
        raw.authorParticipantId,
      ),
      source: raw.source,
      status: raw.status,
      content: MessageContent.create(
        raw.content.map((part) => {
          if (part.type === 'text') {
            return part
          }

          return {
            ...part,
            assetId: new AssetId(part.assetId),
          }
        }),
      ),
      model: raw.model,
      finishReason: raw.finishReason,
      tokenUsage: raw.tokenUsage ? new TokenUsage(raw.tokenUsage) : null,
      errorReason: raw.errorReason,
      createdAt: raw.createdAt,
      updatedAt: raw.updatedAt,
    })
  }

  static messageToPersistence(message: ConversationMessage): MessageRow {
    const content: PersistedMessageContentPart[] = message.content.parts.map(
      (part) => {
        if (part.type === 'text') {
          return {
            type: 'text',
            text: part.text,
          }
        }

        return {
          type: 'asset',
          assetId: part.assetId.value,
          modality: part.modality,
          mediaType: part.mediaType,
          altText: part.altText,
        }
      },
    )

    return {
      id: message.id.value,
      conversationId: message.conversationId.value,
      parentMessageId: message.parentMessageId?.value ?? null,
      authorParticipantId: message.authorParticipantId.value,
      source: message.source,
      status: message.status,
      content,
      model: message.model,
      finishReason: message.finishReason,
      tokenUsage: message.tokenUsage
        ? {
            promptTokens: message.tokenUsage.promptTokens,
            completionTokens: message.tokenUsage.completionTokens,
          }
        : null,
      errorReason: message.errorReason,
      createdAt: message.createdAt,
      updatedAt: message.updatedAt,
    }
  }
}
