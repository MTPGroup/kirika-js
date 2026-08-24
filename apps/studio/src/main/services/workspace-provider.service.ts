import { readFile, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { app } from 'electron'
import type { ProviderApi, WorkspaceApi } from '~/shared/ipc'
import { studioRuntime } from '../studio-runtime'
import { generationService } from './generation.service'
import { ensureWorkspaceOwner, toWorkspaceState } from './workspace.service'

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
    if (error instanceof Error && 'code' in error && error.code === 'ENOENT')
      return []

    throw error
  }
}

async function remember(path: string) {
  const values = [path, ...(await recent()).filter((v) => v !== path)].slice(
    0,
    10,
  )
  await writeFile(recentFile(), JSON.stringify(values, null, 2), 'utf8')
}

async function open(path: string) {
  await generationService.abortAll()
  const runtime = await studioRuntime.open(path)
  await ensureWorkspaceOwner(runtime)
  await remember(runtime.paths.workspaceDir)
  return toWorkspaceState(runtime)
}

export const workspaceService: WorkspaceApi = {
  openWorkspace: (input) => open(input.path),
  createWorkspace: (input) => open(input.path),
  async getWorkspaceState() {
    return studioRuntime.active ? toWorkspaceState(studioRuntime.active) : null
  },
  async closeWorkspace() {
    await generationService.abortAll()
    await studioRuntime.close()
  },
  listRecentWorkspaces: recent,
}

export const providerService: ProviderApi = {
  async listProviders() {
    return studioRuntime.requireActive().settings.listProviders()
  },
  async saveProvider(input) {
    return studioRuntime.requireActive().settings.saveProvider(input)
  },
  async deleteProvider(input) {
    await studioRuntime.requireActive().settings.deleteProvider(input.id)
  },
}
