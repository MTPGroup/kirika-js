import { migrate } from 'drizzle-orm/libsql/migrator'
import type { SqliteDatabase } from './database'

export async function migrateSqliteDatabase(
  db: SqliteDatabase,
  migrationsFolder: string,
) {
  await migrate(db, {
    migrationsFolder,
  })
}
