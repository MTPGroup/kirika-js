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
export function toWorkspaceState(runtime: StudioRuntime): WorkspaceStateDto {
  return {
    workspaceDir: runtime.paths.workspaceDir,
    dbPath: runtime.paths.dbPath,
    assetsDir: runtime.paths.assetsDir,
    schemaVersion: 1,
    ownerId: runtime.settings.ownerId,
    providers: runtime.settings.listProviders(),
    activeCharacterId: runtime.settings.activeCharacterId,
    activeConversationId: runtime.settings.activeConversationId,
  }
}
