import type { Character, CharacterRevision } from '@kirika-js/core/domain/character'
import type {
  Conversation,
  ConversationMessage,
  ConversationParticipant,
} from '@kirika-js/core/domain/conversation'
import type { Lorebook, LorebookEntry, LorebookRevision } from '@kirika-js/core/domain/lorebook'
import type {
  CharacterDto,
  CharacterRevisionDto,
  CharacterSummaryDto,
  ConversationDto,
  ConversationMessageDto,
  ConversationParticipantDto,
  ConversationSummaryDto,
  LorebookDto,
  LorebookEntryDto,
  LorebookRevisionDto,
  LorebookSummaryDto,
  MessageContentPartDto,
  TokenUsageDto,
} from '~/shared/ipc'

export function toCharacterRevisionDto(revision: CharacterRevision): CharacterRevisionDto {
  return {
    id: revision.id.value,
    revisionNumber: revision.revisionNumber,
    isDraft: revision.isDraft,
    name: revision.name,
    description: revision.description,
    personality: revision.personality,
    scenario: revision.scenario,
    systemPrompt: revision.systemPrompt,
    postHistoryInstructions: revision.postHistoryInstructions,
    greetings: [...revision.greetings],
    examples: [...revision.examples],
    extensions: revision.extensions,
    assets: revision.assets.map((asset) => ({
      assetId: asset.assetId.value,
      kind: asset.kind,
      name: asset.name,
      uri: asset.uri,
      ordinal: asset.ordinal,
      extensions: asset.extensions,
    })),
    lorebooks: revision.lorebooks.map((reference) => ({
      lorebookRevisionId: reference.lorebookRevisionId.value,
      ordinal: reference.ordinal,
      enabled: reference.enabled,
    })),
    createdAt: revision.createdAt.toISOString(),
    updatedAt: revision.updatedAt.toISOString(),
  }
}

export function toCharacterDto(character: Character): CharacterDto {
  return {
    id: character.id.value,
    ownerId: character.ownerId.value,
    alias: character.alias,
    currentRevisionId: character.currentRevision?.id.value ?? null,
    draftRevisionId: character.draftRevision?.id.value ?? null,
    revisions: character.revisions.map(toCharacterRevisionDto),
    createdAt: character.createdAt.toISOString(),
    updatedAt: character.updatedAt.toISOString(),
  }
}

export function toCharacterSummaryDto(character: Character): CharacterSummaryDto {
  const display = character.currentRevision ?? character.draftRevision
  return {
    id: character.id.value,
    alias: character.alias,
    name: display?.name ?? character.alias ?? '',
    currentRevisionId: character.currentRevision?.id.value ?? null,
    draftRevisionId: character.draftRevision?.id.value ?? null,
    revisionCount: character.revisions.length,
    hasDraft: character.draftRevision !== null,
    updatedAt: character.updatedAt.toISOString(),
  }
}

function toLorebookEntryDto(entry: LorebookEntry): LorebookEntryDto {
  return {
    id: entry.id.value,
    keys: [...entry.keys],
    title: entry.title,
    enabled: entry.enabled,
    content: entry.content,
    position: entry.position,
    insertionDepth: entry.insertionDepth,
    priority: entry.priority,
    secondaryKeys: entry.secondaryKeys,
    matchMode: entry.matchMode,
    constant: entry.constant,
    caseSensitive: entry.caseSensitive,
    matchWholeWords: entry.matchWholeWords,
    probability: entry.probability,
  }
}
function toLorebookRevisionDto(revision: LorebookRevision): LorebookRevisionDto {
  return {
    id: revision.id.value,
    revisionNumber: revision.revisionNumber,
    isDraft: revision.isDraft,
    scanDepth: revision.scanDepth,
    tokenBudget: revision.tokenBudget,
    entries: revision.entries.map(toLorebookEntryDto),
  }
}
export function toLorebookDto(lorebook: Lorebook): LorebookDto {
  return {
    id: lorebook.id.value,
    ownerId: lorebook.ownerId.value,
    name: lorebook.name,
    description: lorebook.description,
    visibility: lorebook.visibility,
    currentRevisionId: lorebook.currentRevision?.id.value ?? null,
    draftRevisionId: lorebook.draftRevision?.id.value ?? null,
    revisions: lorebook.revisions.map(toLorebookRevisionDto),
    createdAt: lorebook.createdAt.toISOString(),
    updatedAt: lorebook.updatedAt.toISOString(),
  }
}
export function toLorebookSummaryDto(lorebook: Lorebook): LorebookSummaryDto {
  const revision = lorebook.draftRevision ?? lorebook.currentRevision
  return {
    id: lorebook.id.value,
    name: lorebook.name,
    description: lorebook.description,
    visibility: lorebook.visibility,
    currentRevisionId: lorebook.currentRevision?.id.value ?? null,
    draftRevisionId: lorebook.draftRevision?.id.value ?? null,
    revisionCount: lorebook.revisions.length,
    entryCount: revision?.entries.length ?? 0,
    updatedAt: lorebook.updatedAt.toISOString(),
  }
}

export function toParticipantDto(participant: ConversationParticipant): ConversationParticipantDto {
  return {
    id: participant.id.value,
    type: participant.type,
    role: participant.role,
    status: participant.status,
    userId: participant.userId?.value ?? null,
    characterId: participant.characterId?.value ?? null,
    characterRevisionId: participant.characterRevisionId?.value ?? null,
    displayName: participant.displayName,
    joinedAt: participant.joinedAt.toISOString(),
    leftAt: participant.leftAt?.toISOString() ?? null,
  }
}
export function toConversationDto(conversation: Conversation): ConversationDto {
  return {
    id: conversation.id.value,
    ownerId: conversation.ownerId.value,
    title: conversation.title,
    mode: conversation.mode,
    status: conversation.status,
    turnPolicy: conversation.turnPolicy,
    participants: conversation.participants.map(toParticipantDto),
    activeLeafMessageId: conversation.activeLeafMessageId?.value ?? null,
    activeGenerationMessageId: conversation.activeGenerationMessageId?.value ?? null,
    createdAt: conversation.createdAt.toISOString(),
    updatedAt: conversation.updatedAt.toISOString(),
    archivedAt: conversation.archivedAt?.toISOString() ?? null,
  }
}
export function toConversationSummaryDto(
  conversation: Conversation,
  messageCount: number,
): ConversationSummaryDto {
  const dto = toConversationDto(conversation)
  return {
    id: dto.id,
    title: dto.title,
    mode: dto.mode,
    status: dto.status,
    turnPolicy: dto.turnPolicy,
    participants: dto.participants,
    activeLeafMessageId: dto.activeLeafMessageId,
    activeGenerationMessageId: dto.activeGenerationMessageId,
    messageCount,
    updatedAt: dto.updatedAt,
    archivedAt: dto.archivedAt,
  }
}
function toTokenUsageDto(message: ConversationMessage): TokenUsageDto | null {
  const usage = message.tokenUsage
  return usage
    ? {
        promptTokens: usage.promptTokens,
        completionTokens: usage.completionTokens,
        totalTokens: usage.totalTokens,
      }
    : null
}
export function toMessageContentPartDto(
  part: ConversationMessage['content']['parts'][number],
): MessageContentPartDto {
  return part.type === 'text'
    ? { type: 'text', text: part.text }
    : {
        type: 'asset',
        assetId: part.assetId.value,
        modality: part.modality,
        mediaType: part.mediaType,
        altText: part.altText,
      }
}
export function toConversationMessageDto(message: ConversationMessage): ConversationMessageDto {
  return {
    id: message.id.value,
    conversationId: message.conversationId.value,
    parentMessageId: message.parentMessageId?.value ?? null,
    authorParticipantId: message.authorParticipantId.value,
    source: message.source,
    status: message.status,
    content: message.content.parts.map(toMessageContentPartDto),
    model: message.model,
    finishReason: message.finishReason,
    tokenUsage: toTokenUsageDto(message),
    errorReason: message.errorReason,
    createdAt: message.createdAt.toISOString(),
    updatedAt: message.updatedAt.toISOString(),
  }
}
