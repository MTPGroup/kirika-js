import type { ChatGenerationConfig } from '@kirika-js/chat-engine'

export type ProviderType = 'openai-compatible'
export type ApiKeyUpdate =
  | { readonly action: 'retain' }
  | { readonly action: 'replace'; readonly value: string }
  | { readonly action: 'clear' }

export interface ProviderDto {
  readonly id: string
  readonly type: ProviderType
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

export interface SaveProviderInput {
  readonly id?: string
  readonly type?: ProviderType
  readonly name: string
  readonly baseUrl: string
  readonly apiKey: ApiKeyUpdate
  readonly defaultModel: string
  readonly generation?: ChatGenerationConfigDto
  readonly enabled?: boolean
}

export interface DeleteProviderInput {
  readonly id: string
}

export interface ProviderConnectionInput {
  readonly providerId?: string
  readonly baseUrl: string
  readonly apiKey: ApiKeyUpdate
  readonly model?: string
}

export interface ProviderConnectionResult {
  readonly ok: true
  readonly modelCount: number
  readonly message: string
}

export interface ProviderModelDto {
  readonly id: string
  readonly ownedBy?: string
}

export interface ProviderModelsResult {
  readonly models: readonly ProviderModelDto[]
}

export const providerChannels = {
  list: 'studio:providers:list',
  save: 'studio:providers:save',
  delete: 'studio:providers:delete',
  testConnection: 'studio:providers:test-connection',
  listModels: 'studio:providers:list-models',
} as const

export interface ProviderApi {
  listProviders(): Promise<readonly ProviderDto[]>
  saveProvider(input: SaveProviderInput): Promise<ProviderDto>
  deleteProvider(input: DeleteProviderInput): Promise<void>
  testProviderConnection(
    input: ProviderConnectionInput,
  ): Promise<ProviderConnectionResult>
  listProviderModels(
    input: ProviderConnectionInput,
  ): Promise<ProviderModelsResult>
}
