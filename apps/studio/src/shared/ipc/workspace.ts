import type { ProviderDto } from './provider'

export interface WorkspaceStateDto {
  readonly workspaceDir: string
  readonly dbPath: string
  readonly assetsDir: string
  readonly schemaVersion: number
  readonly ownerId: string
  readonly providers: readonly ProviderDto[]
  readonly activeCharacterId: string | null
  readonly activeConversationId: string | null
}

export interface OpenWorkspaceInput {
  readonly path: string
}

export interface CreateWorkspaceInput {
  readonly path: string
  readonly name?: string
}

export const workspaceChannels = {
  open: 'studio:workspace:open',
  create: 'studio:workspace:create',
  getState: 'studio:workspace:get-state',
  close: 'studio:workspace:close',
  listRecent: 'studio:workspace:list-recent',
} as const

export interface WorkspaceApi {
  openWorkspace(input: OpenWorkspaceInput): Promise<WorkspaceStateDto>
  createWorkspace(input: CreateWorkspaceInput): Promise<WorkspaceStateDto>
  getWorkspaceState(): Promise<WorkspaceStateDto | null>
  closeWorkspace(): Promise<void>
  listRecentWorkspaces(): Promise<readonly string[]>
}
