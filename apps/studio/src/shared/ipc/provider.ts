import type { ChatGenerationConfig } from '@kirika-js/chat-engine'

export interface ProviderDto {
  readonly id: string
  readonly name: string
  readonly baseUrl: string
  readonly defaultModel: string
  readonly generation: ChatGenerationConfigDto
  readonly hasApiKey: boolean
  readonly enabled: boolean
}

export type ChatGenerationConfigDto = Pick<
  ChatGenerationConfig,
  'maxOutputTokens' | 'temperature' | 'topP' | 'stopSequences' | 'seed'
>

export interface ProviderConfig extends ChatGenerationConfigDto {
  readonly id: string
  readonly name: string
  readonly baseUrl: string
  readonly apiKey?: string
  readonly defaultModel: string
  readonly stream: boolean
  readonly useLorebook: boolean
  readonly saveHistory: boolean
  readonly enabled?: boolean
}

export interface SaveProviderInput {
  readonly id?: string
  readonly name: string
  readonly baseUrl: string
  readonly apiKey?: string
  readonly defaultModel: string
  readonly generation?: ChatGenerationConfigDto
  readonly enabled?: boolean
}

export interface DeleteProviderInput {
  readonly id: string
}

export const providerChannels = {
  list: 'studio:providers:list',
  save: 'studio:providers:save',
  delete: 'studio:providers:delete',
} as const

export interface ProviderApi {
  listProviders(): Promise<readonly ProviderDto[]>
  saveProvider(input: SaveProviderInput): Promise<ProviderDto>
  deleteProvider(input: DeleteProviderInput): Promise<void>
}
