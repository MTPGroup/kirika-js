import { sql } from 'drizzle-orm'
import { drizzle } from 'drizzle-orm/libsql'

export function createSqliteDatabase(url: string) {
  const db = drizzle(url)

  db.run(sql`pragma foreign_keys = on`)

  return db
}

export type SqliteDatabase = ReturnType<typeof createSqliteDatabase>
