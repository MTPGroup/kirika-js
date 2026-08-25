import { eq } from 'drizzle-orm'
import { idempotencyKeys } from '../db/idempotency-schema'
import type { Db } from '../lib/db'

export interface IdempotencyRecord {
  readonly key: string
  readonly userId: string
  readonly resourceId: string
}

export class PgIdempotencyStore {
  constructor(private readonly db: Db) {}

  async find(key: string): Promise<IdempotencyRecord | null> {
    const [row] = await this.db
      .select()
      .from(idempotencyKeys)
      .where(eq(idempotencyKeys.key, key))
      .limit(1)

    if (!row) return null
    return {
      key: row.key,
      userId: row.userId,
      resourceId: row.resourceId,
    }
  }

  async create(
    key: string,
    userId: string,
    resourceId: string,
    expiresAt: Date,
  ): Promise<void> {
    await this.db
      .insert(idempotencyKeys)
      .values({ key, userId, resourceId, expiresAt })
      .onConflictDoNothing()
  }
}
