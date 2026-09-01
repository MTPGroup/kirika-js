import { createHash } from 'node:crypto'
import { mkdir } from 'node:fs/promises'
import { join, resolve } from 'node:path'
import {
  createSqliteDatabase,
  migrateSqliteDatabase,
  SqliteAssetRepository,
  SqliteCharacterRepository,
  SqliteConversationMessageRepository,
  SqliteConversationRepository,
  SqliteConversationUnitOfWork,
  type SqliteDatabase,
  SqliteLorebookRepository,
} from '@kirika-js/adapter-persistence-sqlite'
import { FilesystemObjectStorage } from '@kirika-js/adapter-storage-filesystem'
import type { ObjectStoragePort } from '@kirika-js/core/storage'
import { app } from 'electron'
import { ProviderCredentialStore } from './services/provider-credential.store'
import { WorkspaceSettingsStore } from './services/workspace-settings.store'

export interface StudioRuntimePaths {
  readonly workspaceDir: string
  readonly dataDir: string
  readonly dbPath: string
  readonly objectsDir: string
  readonly migrationsDir: string
}

export interface StudioRuntime {
  readonly paths: StudioRuntimePaths
  readonly db: SqliteDatabase
  readonly characterRepository: SqliteCharacterRepository
  readonly lorebookRepository: SqliteLorebookRepository
  readonly assetRepository: SqliteAssetRepository
  readonly conversationRepository: SqliteConversationRepository
  readonly messageRepository: SqliteConversationMessageRepository
  readonly conversationUnitOfWork: SqliteConversationUnitOfWork
  readonly objectStorage: ObjectStoragePort
  readonly settings: WorkspaceSettingsStore
  close(): Promise<void>
}

export interface CreateStudioRuntimeOptions {
  readonly migrationsDir?: string
  readonly workspaceName?: string
}

export async function createStudioRuntime(
  workspaceDir: string,
  options: CreateStudioRuntimeOptions = {},
): Promise<StudioRuntime> {
  const paths = resolveRuntimePaths(workspaceDir, options.migrationsDir)

  await Promise.all([
    mkdir(paths.workspaceDir, { recursive: true }),
    mkdir(paths.dataDir, { recursive: true }),
    mkdir(paths.objectsDir, { recursive: true }),
  ])

  const db = createSqliteDatabase(`file:${paths.dbPath}`)
  const workspaceNamespace = createHash('sha256').update(paths.workspaceDir).digest('hex')
  const credentials = new ProviderCredentialStore(
    join(app.getPath('userData'), 'provider-credentials', `${workspaceNamespace}.json`),
  )
  const settings = await WorkspaceSettingsStore.open(
    paths.workspaceDir,
    credentials,
    options.workspaceName,
  )

  try {
    await migrateSqliteDatabase(db, paths.migrationsDir)
  } catch (error) {
    db.$client.close()
    throw error
  }

  const conversationUnitOfWork = new SqliteConversationUnitOfWork(db)
  await conversationUnitOfWork.recoverInterruptedGenerations()

  return {
    paths,
    db,
    characterRepository: new SqliteCharacterRepository(db),
    lorebookRepository: new SqliteLorebookRepository(db),
    assetRepository: new SqliteAssetRepository(db),
    conversationRepository: new SqliteConversationRepository(db),
    messageRepository: new SqliteConversationMessageRepository(db),
    conversationUnitOfWork,
    objectStorage: new FilesystemObjectStorage({ rootDir: paths.objectsDir }),
    settings,
    close: async () => {
      db.$client.close()
    },
  }
}

export class StudioRuntimeManager {
  private current: StudioRuntime | null = null
  private operation: Promise<void> = Promise.resolve()

  get active(): StudioRuntime | null {
    return this.current
  }

  requireActive(): StudioRuntime {
    if (!this.current) throw new StudioWorkspaceNotOpenError()
    return this.current
  }

  async open(
    workspaceDir: string,
    options: CreateStudioRuntimeOptions = {},
  ): Promise<StudioRuntime> {
    return this.runExclusive(async () => {
      const normalizedDir = normalizeWorkspaceDir(workspaceDir)
      if (this.current?.paths.workspaceDir === normalizedDir) return this.current

      const next = await createStudioRuntime(normalizedDir, options)
      const previous = this.current
      this.current = next
      await previous?.close()
      return next
    })
  }

  async close(): Promise<void> {
    await this.runExclusive(async () => {
      const runtime = this.current
      this.current = null
      await runtime?.close()
    })
  }

  private async runExclusive<T>(operation: () => Promise<T>): Promise<T> {
    const previous = this.operation
    let release: (() => void) | undefined
    this.operation = new Promise<void>((resolveOperation) => {
      release = resolveOperation
    })

    await previous
    try {
      return await operation()
    } finally {
      release?.()
    }
  }
}

export class StudioWorkspaceNotOpenError extends Error {
  constructor() {
    super('尚未打开 Studio workspace')
    this.name = 'StudioWorkspaceNotOpenError'
  }
}

export function resolveMigrationsDir(): string {
  if (app.isPackaged) {
    return join(process.resourcesPath, 'migrations', 'sqlite')
  }

  return resolve(
    app.getAppPath(),
    '..',
    '..',
    'packages',
    'adapters',
    'persistence-sqlite',
    'drizzle',
  )
}

function resolveRuntimePaths(workspaceDir: string, migrationsDir?: string): StudioRuntimePaths {
  const normalizedWorkspaceDir = normalizeWorkspaceDir(workspaceDir)
  const dataDir = join(normalizedWorkspaceDir, 'data')

  return {
    workspaceDir: normalizedWorkspaceDir,
    dataDir,
    dbPath: join(dataDir, 'studio.sqlite'),
    // Keep the existing directory name so current workspaces remain compatible.
    objectsDir: join(normalizedWorkspaceDir, 'assets'),
    migrationsDir: migrationsDir ? resolve(migrationsDir) : resolveMigrationsDir(),
  }
}

function normalizeWorkspaceDir(workspaceDir: string): string {
  const normalized = workspaceDir.trim()
  if (!normalized) throw new Error('workspaceDir 不能为空')
  return resolve(normalized)
}

export const studioRuntime = new StudioRuntimeManager()
