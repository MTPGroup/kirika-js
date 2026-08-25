import type { ChatModelFinishReason } from '@kirika-js/core/chat'
import type {
  ConversationMessageDto,
  ConversationParticipantDto,
  MessageContentPartDto,
  TokenUsageDto,
} from './conversation'
import type { ChatGenerationConfigDto } from './provider'

export interface GenerationMessageDto {
  readonly role: 'system' | 'user' | 'assistant'
  readonly name?: string
  readonly content: readonly MessageContentPartDto[]
}

export interface GenerationRequestDto extends ChatGenerationConfigDto {
  readonly model: string
  readonly messages: readonly GenerationMessageDto[]
}

export interface GenerationContextOverrideDto {
  readonly includeCharacterLorebooks: boolean
  readonly lorebookRevisionIds: readonly string[]
}

export interface StartGenerationInput {
  readonly requestId: string
  readonly conversationId: string
  readonly providerId: string
  readonly model?: string
  readonly speakerParticipantId?: string
  readonly generation?: ChatGenerationConfigDto
}

export interface StartTestGenerationInput extends StartGenerationInput {
  readonly characterId: string
  readonly characterRevisionId: string
  readonly contextOverride: GenerationContextOverrideDto
}

export interface StartGenerationResult {
  readonly requestId: string
}

export interface AbortGenerationInput {
  readonly requestId: string
}

interface GenerationEventBase {
  readonly requestId: string
  readonly messageId: string
}

export type GenerationEvent =
  | (GenerationEventBase & {
      readonly type: 'preparing'
      readonly stage: 'provider' | 'conversation' | 'history' | 'context'
    })
  | (GenerationEventBase & {
      readonly type: 'started'
      readonly speaker: ConversationParticipantDto
      readonly request: GenerationRequestDto
    })
  | (GenerationEventBase & {
      readonly type: 'text_delta'
      readonly delta: string
    })
  | (GenerationEventBase & {
      readonly type: 'content_part'
      readonly part: MessageContentPartDto
    })
  | (GenerationEventBase & {
      readonly type: 'completed'
      readonly finishReason: Extract<ChatModelFinishReason, 'stop' | 'length'>
      readonly tokenUsage: TokenUsageDto | null
      readonly message: ConversationMessageDto
    })
  | (GenerationEventBase & {
      readonly type: 'failed'
      readonly reason: string
      /** 生成在创建消息前失败时不存在。 */
      readonly message?: ConversationMessageDto
    })
  | (GenerationEventBase & {
      readonly type: 'cancelled'
      readonly message: ConversationMessageDto
    })

export const generationChannels = {
  start: 'studio:generation:start',
  startTest: 'studio:generation:start-test',
  abort: 'studio:generation:abort',
  event: 'studio:generation:event',
} as const

export interface GenerationApi {
  startGeneration(input: StartGenerationInput): Promise<StartGenerationResult>
  startTestGeneration(
    input: StartTestGenerationInput,
  ): Promise<StartGenerationResult>
  abortGeneration(input: AbortGenerationInput): Promise<void>
  onGenerationEvent(listener: (event: GenerationEvent) => void): () => void
}
