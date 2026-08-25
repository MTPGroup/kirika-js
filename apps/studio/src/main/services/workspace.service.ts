import { users } from '@kirika-js/adapter-persistence-sqlite'
import type { WorkspaceStateDto } from '~/shared/ipc'
import type { StudioRuntime } from '../studio-runtime'

export async function ensureWorkspaceOwner(
  runtime: StudioRuntime,
  displayName = 'You',
): Promise<void> {
  await runtime.db
    .insert(users)
    .values({ id: runtime.settings.ownerId, name: displayName })
    .onConflictDoNothing({ target: users.id })
}

export async function toWorkspaceState(
  runtime: StudioRuntime,
): Promise<WorkspaceStateDto> {
  return {
    rootDir: runtime.paths.workspaceDir,
    name: runtime.settings.name,
    dbPath: runtime.paths.dbPath,
    // Preserve the existing IPC field name for renderer compatibility.
    assetsDir: runtime.paths.objectsDir,
    schemaVersion: 1,
    ownerId: runtime.settings.ownerId,
    providers: await runtime.settings.listProviders(),
    activeCharacterId: runtime.settings.activeCharacterId,
    activeConversationId: runtime.settings.activeConversationId,
  }
}
