import type {
  AssetMessageContentPart,
  MessageContentPart,
} from '../domain/conversation'
import type { TokenUsage } from './token-usage'

export const CHAT_MODEL_ROLES = ['system', 'user', 'assistant'] as const
export type ChatModelRole = (typeof CHAT_MODEL_ROLES)[number]

export interface ChatModelMessage {
  readonly role: ChatModelRole
  readonly content: readonly MessageContentPart[]
  readonly name?: string
}

export interface ChatGenerationConfig {
  readonly maxOutputTokens?: number
  readonly temperature?: number
  readonly topP?: number
  readonly stopSequences?: readonly string[]
  readonly seed?: number
  readonly metadata?: Readonly<Record<string, unknown>>
}

export interface ChatModelRequest extends ChatGenerationConfig {
  readonly model: string
  readonly messages: readonly ChatModelMessage[]
}

export type ChatModelFinishReason =
  | 'stop'
  | 'length'
  | 'tool_call'
  | 'content_filter'
  | 'unknown'

export type ChatModelStreamEvent =
  | {
      readonly type: 'text_delta'
      readonly delta: string
    }
  | {
      readonly type: 'content_part'
      readonly part: AssetMessageContentPart
    }
  | {
      readonly type: 'finish'
      readonly finishReason: ChatModelFinishReason
      readonly tokenUsage?: TokenUsage
    }
