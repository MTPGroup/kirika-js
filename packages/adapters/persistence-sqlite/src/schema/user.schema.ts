import { randomUUID } from 'node:crypto'
import { sql } from 'drizzle-orm'
import { integer, sqliteTable, text } from 'drizzle-orm/sqlite-core'

export const users = sqliteTable('users', {
  id: text('id')
    .primaryKey()
    .$defaultFn(() => randomUUID()),

  name: text('name').notNull(),

  createdAt: integer('created_at', {
    mode: 'timestamp_ms',
  })
    .notNull()
    .default(sql`(unixepoch() * 1000)`),

  updatedAt: integer('updated_at', {
    mode: 'timestamp_ms',
  })
    .notNull()
    .default(sql`(unixepoch() * 1000)`),
})
