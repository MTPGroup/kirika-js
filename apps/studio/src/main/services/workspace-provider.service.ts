import { readFile, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { OpenAICompatibleProviderClient } from '@kirika-js/adapter-model-openai-compatible'
import { app } from 'electron'
import type { ProviderApi, ProviderConnectionInput, WorkspaceApi } from '~/shared/ipc'
import { studioRuntime } from '../studio-runtime'
import { generationService } from './generation.service'
import { ensureWorkspaceOwner, toWorkspaceState } from './workspace.service'

const PROVIDER_REQUEST_TIMEOUT_MS = 15_000

function normalizeUrl(value: string): string {
  const url = new URL(value.trim())
  return `${url.origin}${url.pathname.replace(/\/$/, '')}`
}

function recentFile(): string {
  return join(app.getPath('userData'), 'recent-workspaces.json')
}

async function recent(): Promise<string[]> {
  try {
    const value = JSON.parse(await readFile(recentFile(), 'utf8'))
    return Array.isArray(value)
      ? value.filter((item): item is string => typeof item === 'string')
      : []
  } catch (error) {
    if (error instanceof Error && 'code' in error && error.code === 'ENOENT') return []
    throw error
  }
}

async function remember(path: string) {
  const values = [path, ...(await recent()).filter((v) => v !== path)].slice(0, 10)
  await writeFile(recentFile(), JSON.stringify(values, null, 2), 'utf8')
}

async function open(path: string, workspaceName?: string) {
  await generationService.abortAll()
  const runtime = await studioRuntime.open(path, { workspaceName })
  await ensureWorkspaceOwner(runtime)
  await remember(runtime.paths.workspaceDir)
  return await toWorkspaceState(runtime)
}

async function createProviderClient(input: ProviderConnectionInput) {
  const runtime = studioRuntime.requireActive()
  if (input.apiKey.action === 'retain') {
    const stored = input.providerId ? runtime.settings.getProvider(input.providerId) : null
    if (!stored) throw new Error('Provider 不存在，无法保留 API Key')
    if (normalizeUrl(stored.baseUrl) !== normalizeUrl(input.baseUrl)) {
      throw new Error('Base URL 已更改，请重新输入 API Key 后再测试连接')
    }
  }
  const apiKey = await runtime.settings.resolveApiKey(input.providerId, input.apiKey)
  return new OpenAICompatibleProviderClient({
    baseUrl: input.baseUrl.trim(),
    apiKey,
    timeoutMs: PROVIDER_REQUEST_TIMEOUT_MS,
  })
}

async function fetchModels(input: ProviderConnectionInput) {
  const client = await createProviderClient(input)
  return await client.listModels()
}

export const workspaceService: WorkspaceApi = {
  openWorkspace: (input) => open(input.path),
  createWorkspace: (input) => open(input.path, input.name),
  async getWorkspaceState() {
    return studioRuntime.active ? await toWorkspaceState(studioRuntime.active) : null
  },
  async closeWorkspace() {
    await generationService.abortAll()
    await studioRuntime.close()
  },
  listRecentWorkspaces: recent,
}

export const providerService: ProviderApi = {
  async listProviders() {
    return await studioRuntime.requireActive().settings.listProviders()
  },
  async saveProvider(input) {
    return await studioRuntime.requireActive().settings.saveProvider(input)
  },
  async deleteProvider(input) {
    await studioRuntime.requireActive().settings.deleteProvider(input.id)
  },
  async listProviderModels(input) {
    return { models: await fetchModels(input) }
  },
  async testProviderConnection(input) {
    const startedAt = performance.now()
    const models = await fetchModels(input)
    return {
      ok: true,
      modelCount: models.length,
      message: `连接成功，发现 ${models.length} 个模型（${Math.round(performance.now() - startedAt)} ms）`,
    }
  },
}
