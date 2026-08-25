import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { createClient } from '@libsql/client'
import { sql } from 'drizzle-orm'
import { drizzle } from 'drizzle-orm/libsql'
import { migrate } from 'drizzle-orm/libsql/migrator'

const migrationsFolder = fileURLToPath(
  new URL('../../drizzle', import.meta.url),
)

export async function createTestDatabase() {
  const directory = await mkdtemp(path.join(tmpdir(), 'kirika-sqlite-test-'))

  const databasePath = path.join(directory, 'test.sqlite')

  const client = createClient({
    url: `file:${databasePath}`,
  })

  const db = drizzle({
    client,
  })

  await db.run(sql`pragma foreign_keys = on`)

  await migrate(db, {
    migrationsFolder,
  })

  return {
    db,

    async dispose() {
      client.close()

      await rm(directory, {
        recursive: true,
        force: true,
      })
    },
  }
}

export type TestDatabase = Awaited<ReturnType<typeof createTestDatabase>>['db']
