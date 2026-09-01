import { randomUUID } from 'node:crypto'
import { readFile, rename, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import type { ProviderDto, SaveProviderInput } from '~/shared/ipc'
import type { ProviderCredentialStore } from './provider-credential.store'

export interface StoredProvider {
  id: string
  type: 'openai-compatible'
  name: string
  baseUrl: string
  defaultModel: string
  generation?: SaveProviderInput['generation']
  enabled: boolean
}

interface LegacyStoredProvider extends Omit<StoredProvider, 'type'> {
  type?: 'openai-compatible'
  apiKey?: string
}

interface WorkspaceManifest {
  version: 2
  name: string
  ownerId: string
  activeCharacterId: string | null
  activeConversationId: string | null
  providers: StoredProvider[]
}

interface LegacyWorkspaceManifest extends Omit<WorkspaceManifest, 'version' | 'providers'> {
  version?: 1 | 2
  providers?: LegacyStoredProvider[]
}

export class WorkspaceSettingsStore {
  private constructor(
    readonly filePath: string,
    private data: WorkspaceManifest,
    private readonly credentials: ProviderCredentialStore,
  ) {}

  static async open(
    workspaceDir: string,
    credentials: ProviderCredentialStore,
    name?: string,
  ): Promise<WorkspaceSettingsStore> {
    const filePath = join(workspaceDir, 'workspace.json')
    let raw: LegacyWorkspaceManifest
    try {
      raw = JSON.parse(await readFile(filePath, 'utf8')) as LegacyWorkspaceManifest
    } catch (error) {
      if (!(error instanceof Error && 'code' in error && error.code === 'ENOENT')) throw error
      raw = {
        version: 2,
        name: name?.trim() || 'Kirika Workspace',
        ownerId: randomUUID(),
        activeCharacterId: null,
        activeConversationId: null,
        providers: [],
      }
    }

    const data = normalizeManifest(raw)
    const store = new WorkspaceSettingsStore(filePath, data, credentials)
    await store.migrateLegacyCredentials(raw.providers ?? [])
    await store.flush()
    return store
  }

  get name(): string {
    return this.data.name
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

  async listProviders(): Promise<readonly ProviderDto[]> {
    return await Promise.all(this.data.providers.map((value) => this.toProviderDto(value)))
  }

  getProvider(id: string): StoredProvider | null {
    return this.data.providers.find((item) => item.id === id) ?? null
  }

  async getProviderApiKey(id: string): Promise<string | undefined> {
    return await this.credentials.get(this.credentialKey(id))
  }

  async resolveApiKey(
    providerId: string | undefined,
    update: SaveProviderInput['apiKey'],
  ): Promise<string | undefined> {
    if (update.action === 'replace') return update.value.trim()
    if (update.action === 'clear') return undefined
    if (!providerId) return undefined
    return await this.getProviderApiKey(providerId)
  }

  async saveProvider(input: SaveProviderInput): Promise<ProviderDto> {
    const existing = input.id ? this.getProvider(input.id) : null
    if (input.id && !existing) throw new Error('Provider 不存在')
    if (!existing && input.apiKey.action === 'retain')
      throw new Error('新 Provider 不能保留不存在的 API Key')
    if (
      existing &&
      input.apiKey.action === 'retain' &&
      normalizeUrl(existing.baseUrl) !== normalizeUrl(input.baseUrl)
    ) {
      throw new Error('Base URL 已更改，请重新输入或清除 API Key')
    }

    const provider: StoredProvider = {
      id: existing?.id ?? randomUUID(),
      type: input.type ?? existing?.type ?? 'openai-compatible',
      name: input.name.trim(),
      baseUrl: input.baseUrl.trim(),
      defaultModel: input.defaultModel.trim(),
      generation: input.generation ?? existing?.generation,
      enabled: input.enabled ?? existing?.enabled ?? true,
    }

    if (!provider.name || !provider.baseUrl || !provider.defaultModel)
      throw new Error('Provider 名称、Base URL 和默认模型不能为空')

    const key = this.credentialKey(provider.id)
    const previousCredential = await this.credentials.snapshot(key)
    if (input.apiKey.action === 'replace') {
      await this.credentials.set(key, input.apiKey.value.trim())
    } else if (input.apiKey.action === 'clear') {
      await this.credentials.delete(key)
    }

    const previousProviders = this.data.providers
    this.data.providers = [
      ...this.data.providers.filter((item) => item.id !== provider.id),
      provider,
    ]
    try {
      await this.flush()
    } catch (error) {
      this.data.providers = previousProviders
      await this.credentials.restore(key, previousCredential)
      throw error
    }

    return await this.toProviderDto(provider)
  }

  async deleteProvider(id: string): Promise<void> {
    const existing = this.getProvider(id)
    if (!existing) return
    const key = this.credentialKey(id)
    const previousCredential = await this.credentials.snapshot(key)
    const previousProviders = this.data.providers
    await this.credentials.delete(key)
    this.data.providers = this.data.providers.filter((item) => item.id !== id)
    try {
      await this.flush()
    } catch (error) {
      this.data.providers = previousProviders
      await this.credentials.restore(key, previousCredential)
      throw error
    }
  }

  private credentialKey(providerId: string): string {
    return `${this.data.ownerId}:${providerId}`
  }

  private async toProviderDto(value: StoredProvider): Promise<ProviderDto> {
    return {
      id: value.id,
      type: value.type,
      name: value.name,
      baseUrl: value.baseUrl,
      defaultModel: value.defaultModel,
      generation: value.generation ?? {},
      hasApiKey: await this.credentials.has(this.credentialKey(value.id)),
      enabled: value.enabled,
    }
  }

  private async migrateLegacyCredentials(
    providers: readonly LegacyStoredProvider[],
  ): Promise<void> {
    for (const provider of providers) {
      if (!provider.apiKey) continue
      const key = this.credentialKey(provider.id)
      if (!(await this.credentials.has(key))) {
        await this.credentials.set(key, provider.apiKey)
      }
    }
  }

  private async flush(): Promise<void> {
    const temporaryPath = `${this.filePath}.tmp`
    await writeFile(temporaryPath, JSON.stringify(this.data, null, 2), 'utf8')
    await rename(temporaryPath, this.filePath)
  }
}

function normalizeUrl(value: string): string {
  const url = new URL(value.trim())
  return `${url.origin}${url.pathname.replace(/\/$/, '')}`
}

function normalizeManifest(value: LegacyWorkspaceManifest): WorkspaceManifest {
  const ownerId = value.ownerId || randomUUID()
  return {
    version: 2,
    name: value.name || 'Kirika Workspace',
    ownerId,
    activeCharacterId: value.activeCharacterId ?? null,
    activeConversationId: value.activeConversationId ?? null,
    providers: Array.isArray(value.providers)
      ? value.providers.map((provider) => ({
          id: provider.id,
          type: provider.type ?? 'openai-compatible',
          name: provider.name,
          baseUrl: provider.baseUrl,
          defaultModel: provider.defaultModel,
          generation: provider.generation,
          enabled: provider.enabled ?? true,
        }))
      : [],
  }
}
