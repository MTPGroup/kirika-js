import type {
  ConversationMessageSource,
  ConversationMessageStatus,
  ConversationMode,
  ConversationParticipantRole,
  ConversationParticipantStatus,
  ConversationParticipantType,
  ConversationStatus,
  ConversationTurnPolicy,
  GenerationFinishReason,
  MessageAssetModality,
} from '@kirika-js/domain/conversation'
import type { IsoDateTime } from './common'

export interface ConversationParticipantDto {
  readonly id: string
  readonly type: ConversationParticipantType
  readonly role: ConversationParticipantRole
  readonly status: ConversationParticipantStatus
  readonly userId: string | null
  readonly characterId: string | null
  readonly characterRevisionId: string | null
  readonly displayName: string
  readonly joinedAt: IsoDateTime
  readonly leftAt: IsoDateTime | null
}

export type MessageContentPartDto =
  | { readonly type: 'text'; readonly text: string }
  | {
      readonly type: 'asset'
      readonly assetId: string
      readonly modality: MessageAssetModality
      readonly mediaType: string
      readonly altText: string | null
    }

export type MessageContentInput = string | readonly MessageContentPartDto[]

export interface TokenUsageDto {
  readonly promptTokens: number
  readonly completionTokens: number
  readonly totalTokens: number
}

export interface ConversationMessageDto {
  readonly id: string
  readonly conversationId: string
  readonly parentMessageId: string | null
  readonly authorParticipantId: string
  readonly source: ConversationMessageSource
  readonly status: ConversationMessageStatus
  readonly content: readonly MessageContentPartDto[]
  readonly model: string | null
  readonly finishReason: GenerationFinishReason | null
  readonly tokenUsage: TokenUsageDto | null
  readonly errorReason: string | null
  readonly createdAt: IsoDateTime
  readonly updatedAt: IsoDateTime
}

export interface ConversationDto {
  readonly id: string
  readonly ownerId: string
  readonly title: string | null
  readonly mode: ConversationMode
  readonly status: ConversationStatus
  readonly turnPolicy: ConversationTurnPolicy
  readonly participants: readonly ConversationParticipantDto[]
  readonly activeLeafMessageId: string | null
  readonly activeGenerationMessageId: string | null
  readonly createdAt: IsoDateTime
  readonly updatedAt: IsoDateTime
  readonly archivedAt: IsoDateTime | null
}

export interface ConversationSummaryDto {
  readonly id: string
  readonly title: string | null
  readonly mode: ConversationMode
  readonly status: ConversationStatus
  readonly turnPolicy: ConversationTurnPolicy
  readonly participants: readonly ConversationParticipantDto[]
  readonly activeLeafMessageId: string | null
  readonly activeGenerationMessageId: string | null
  readonly messageCount: number
  readonly updatedAt: IsoDateTime
  readonly archivedAt: IsoDateTime | null
}

export interface CharacterParticipantInput {
  readonly characterId: string
  readonly characterRevisionId: string
  readonly displayName: string
}

export interface CreateConversationInput {
  readonly title?: string | null
  readonly mode?: ConversationMode
  readonly turnPolicy?: ConversationTurnPolicy
  readonly ownerDisplayName: string
  readonly characters: readonly CharacterParticipantInput[]
}

export interface ConversationIdInput {
  readonly conversationId: string
}

export interface AddCharacterParticipantInput extends ConversationIdInput {
  readonly participant: CharacterParticipantInput
}

export interface ParticipantIdInput extends ConversationIdInput {
  readonly participantId: string
}

export interface RenameParticipantInput extends ParticipantIdInput {
  readonly displayName: string
}

export interface SendHumanMessageInput extends ConversationIdInput {
  readonly parentMessageId?: string | null
  readonly content: MessageContentInput
}

export interface SelectConversationBranchInput extends ConversationIdInput {
  readonly leafMessageId: string
}

export interface GetConversationHistoryInput extends ConversationIdInput {
  readonly leafMessageId?: string
}

export interface GetConversationHistoryResult {
  readonly path: readonly ConversationMessageDto[]
}

export const conversationChannels = {
  list: 'studio:conversations:list',
  create: 'studio:conversations:create',
  get: 'studio:conversations:get',
  getHistory: 'studio:conversations:get-history',
  delete: 'studio:conversations:delete',
  rename: 'studio:conversations:rename',
  changeTurnPolicy: 'studio:conversations:change-turn-policy',
  addCharacter: 'studio:conversations:add-character',
  removeParticipant: 'studio:conversations:remove-participant',
  renameParticipant: 'studio:conversations:rename-participant',
  sendHumanMessage: 'studio:conversations:send-human-message',
  selectBranch: 'studio:conversations:select-branch',
  archive: 'studio:conversations:archive',
  restore: 'studio:conversations:restore',
} as const

export interface ConversationApi {
  listConversations(): Promise<readonly ConversationSummaryDto[]>
  createConversation(input: CreateConversationInput): Promise<ConversationDto>
  getConversation(input: ConversationIdInput): Promise<ConversationDto | null>
  getConversationHistory(
    input: GetConversationHistoryInput,
  ): Promise<GetConversationHistoryResult>
  deleteConversation(input: ConversationIdInput): Promise<void>
  renameConversation(
    input: ConversationIdInput & { readonly title: string | null },
  ): Promise<ConversationDto>
  changeConversationTurnPolicy(
    input: ConversationIdInput & {
      readonly turnPolicy: ConversationTurnPolicy
    },
  ): Promise<ConversationDto>
  addCharacterParticipant(
    input: AddCharacterParticipantInput,
  ): Promise<ConversationDto>
  removeConversationParticipant(
    input: ParticipantIdInput,
  ): Promise<ConversationDto>
  renameConversationParticipant(
    input: RenameParticipantInput,
  ): Promise<ConversationDto>
  sendHumanMessage(
    input: SendHumanMessageInput,
  ): Promise<ConversationMessageDto>
  selectConversationBranch(
    input: SelectConversationBranchInput,
  ): Promise<ConversationDto>
  archiveConversation(input: ConversationIdInput): Promise<ConversationDto>
  restoreConversation(input: ConversationIdInput): Promise<ConversationDto>
}
