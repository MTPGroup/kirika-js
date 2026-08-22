import path from 'node:path'
import { migrate } from 'drizzle-orm/libsql/migrator'
import type { SqliteDatabase } from './database'

export async function migrateSqliteDatabase(
  db: SqliteDatabase,
  migrationsFolder: string = path.join(import.meta.dirname, '../drizzle'),
) {
  await migrate(db, {
    migrationsFolder,
  })
}
