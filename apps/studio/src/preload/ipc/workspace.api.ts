import type { WorkspaceApi, WorkspaceStateDto } from '../../shared/ipc'
import { workspaceChannels } from '../../shared/ipc'
import { invoke } from './invoke'

export const workspaceApi: WorkspaceApi = {
  openWorkspace: (input) =>
    invoke<WorkspaceStateDto>(workspaceChannels.open, input),
  createWorkspace: (input) =>
    invoke<WorkspaceStateDto>(workspaceChannels.create, input),
  getWorkspaceState: () =>
    invoke<WorkspaceStateDto | null>(workspaceChannels.getState),
  closeWorkspace: () => invoke<void>(workspaceChannels.close),
  listRecentWorkspaces: () =>
    invoke<readonly string[]>(workspaceChannels.listRecent),
}
