import {
  index,
  integer,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core'

export const idempotencyKeys = pgTable(
  'idempotency_keys',
  {
    key: text('key').primaryKey(),
    userId: uuid('user_id').notNull(),
    resourceId: text('resource_id').notNull(),
    statusCode: integer('status_code'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    expiresAt: timestamp('expires_at').notNull(),
  },
  (t) => [
    uniqueIndex('idempotency_keys_user_resource_uq').on(t.userId, t.resourceId),
    index('idempotency_keys_expires_at_idx').on(t.expiresAt),
  ],
)
