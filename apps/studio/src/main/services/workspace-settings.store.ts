import { randomUUID } from 'node:crypto'
import { readFile, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import type { ProviderDto, SaveProviderInput } from '~/shared/ipc'

interface StoredProvider {
  id: string
  name: string
  baseUrl: string
  apiKey?: string
  defaultModel: string
  generation?: SaveProviderInput['generation']
  enabled: boolean
}
interface WorkspaceManifest {
  version: 1
  name: string
  ownerId: string
  activeCharacterId: string | null
  activeConversationId: string | null
  providers: StoredProvider[]
}

export class WorkspaceSettingsStore {
  private constructor(
    readonly filePath: string,
    private data: WorkspaceManifest,
  ) {}

  static async open(
    workspaceDir: string,
    name?: string,
  ): Promise<WorkspaceSettingsStore> {
    const filePath = join(workspaceDir, 'workspace.json')
    let data: WorkspaceManifest
    try {
      data = JSON.parse(await readFile(filePath, 'utf8')) as WorkspaceManifest
    } catch (error) {
      if (
        !(error instanceof Error && 'code' in error && error.code === 'ENOENT')
      )
        throw error
      data = {
        version: 1,
        name: name?.trim() || 'Kirika Workspace',
        ownerId: randomUUID(),
        activeCharacterId: null,
        activeConversationId: null,
        providers: [],
      }
      await writeFile(filePath, JSON.stringify(data, null, 2), 'utf8')
    }
    return new WorkspaceSettingsStore(filePath, normalizeManifest(data))
  }

  get ownerId(): string {
    return this.data.ownerId
  }
  get activeCharacterId(): string | null {
    return this.data.activeCharacterId
  }
  get activeConversationId(): string | null {
    return this.data.activeConversationId
  }
  listProviders(): readonly ProviderDto[] {
    return this.data.providers.map(toProviderDto)
  }
  getProvider(id: string): StoredProvider | null {
    return this.data.providers.find((item) => item.id === id) ?? null
  }

  async saveProvider(input: SaveProviderInput): Promise<ProviderDto> {
    const existing = input.id ? this.getProvider(input.id) : null
    const provider: StoredProvider = {
      id: existing?.id ?? randomUUID(),
      name: input.name.trim(),
      baseUrl: input.baseUrl.trim(),
      apiKey:
        input.apiKey === undefined
          ? existing?.apiKey
          : input.apiKey.trim() || undefined,
      defaultModel: input.defaultModel.trim(),
      generation: input.generation ?? existing?.generation,
      enabled: input.enabled ?? existing?.enabled ?? true,
    }
    if (!provider.name || !provider.baseUrl || !provider.defaultModel)
      throw new Error('Provider 名称、Base URL 和默认模型不能为空')
    this.data.providers = [
      ...this.data.providers.filter((item) => item.id !== provider.id),
      provider,
    ]
    await this.flush()
    return toProviderDto(provider)
  }
  async deleteProvider(id: string): Promise<void> {
    this.data.providers = this.data.providers.filter((item) => item.id !== id)
    await this.flush()
  }
  private async flush(): Promise<void> {
    await writeFile(this.filePath, JSON.stringify(this.data, null, 2), 'utf8')
  }
}
function toProviderDto(value: StoredProvider): ProviderDto {
  return {
    id: value.id,
    name: value.name,
    baseUrl: value.baseUrl,
    defaultModel: value.defaultModel,
    generation: value.generation ?? {},
    hasApiKey: Boolean(value.apiKey),
    enabled: value.enabled,
  }
}
function normalizeManifest(value: WorkspaceManifest): WorkspaceManifest {
  if (!value.ownerId) value.ownerId = randomUUID()
  return {
    version: 1,
    name: value.name || 'Kirika Workspace',
    ownerId: value.ownerId,
    activeCharacterId: value.activeCharacterId ?? null,
    activeConversationId: value.activeConversationId ?? null,
    providers: Array.isArray(value.providers) ? value.providers : [],
  }
}
