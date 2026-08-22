import { sql } from 'drizzle-orm'
import { drizzle } from 'drizzle-orm/libsql'

export function createSqliteDatabase(path: string) {
  const db = drizzle(path)

  db.run(sql`pragma foreign_keys = on`)

  return db
}

export type SqliteDatabase = ReturnType<typeof createSqliteDatabase>
