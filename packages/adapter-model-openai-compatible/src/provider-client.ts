import OpenAI from 'openai'

export interface OpenAICompatibleModelInfo {
  readonly id: string
  readonly ownedBy?: string
}

export interface OpenAICompatibleProviderClientOptions {
  readonly baseUrl: string
  readonly apiKey?: string
  readonly timeoutMs?: number
  readonly client?: OpenAI
}

export class OpenAICompatibleProviderClient {
  private readonly client: OpenAI

  constructor(options: OpenAICompatibleProviderClientOptions) {
    this.client =
      options.client ??
      new OpenAI({
        baseURL: options.baseUrl,
        apiKey: options.apiKey || 'dummy',
        timeout: options.timeoutMs ?? 15_000,
        maxRetries: 0,
      })
  }

  async listModels(): Promise<readonly OpenAICompatibleModelInfo[]> {
    const page = await this.client.models.list()
    const data = page.data as Array<{ id: string; owned_by?: string }>
    return data
      .map(
        (model): OpenAICompatibleModelInfo => ({
          id: model.id,
          ownedBy: model.owned_by,
        }),
      )
      .filter(
        (model, index, values) =>
          values.findIndex((candidate) => candidate.id === model.id) === index,
      )
      .sort((left, right) => left.id.localeCompare(right.id))
  }
}
