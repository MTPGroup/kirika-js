import {
  Asset,
  AssetId,
  type AssetRepositoryPort,
} from '@kirika-js/core/domain/character'
import { eq } from 'drizzle-orm'
import { assets } from '../db/character-schema'
import type { Db } from '../lib/db'

type AssetRow = typeof assets.$inferSelect

export class PgAssetRepository implements AssetRepositoryPort {
  constructor(private readonly db: Db) {}

  async findById(id: AssetId): Promise<Asset | null> {
    const [row] = await this.db
      .select()
      .from(assets)
      .where(eq(assets.id, id.value))
      .limit(1)
    return row ? toDomain(row) : null
  }

  async findBySha256(sha256: string): Promise<Asset | null> {
    const [row] = await this.db
      .select()
      .from(assets)
      .where(eq(assets.sha256, Buffer.from(sha256, 'hex')))
      .limit(1)
    return row ? toDomain(row) : null
  }

  async save(asset: Asset): Promise<void> {
    await this.db
      .insert(assets)
      .values({
        id: asset.id.value,
        storageKey: asset.storageKey,
        mediaType: asset.mediaType,
        byteSize: asset.byteSize,
        sha256: asset.sha256 ? Buffer.from(asset.sha256, 'hex') : null,
      })
      .onConflictDoUpdate({
        target: assets.id,
        set: {
          storageKey: asset.storageKey,
          mediaType: asset.mediaType,
          byteSize: asset.byteSize,
          sha256: asset.sha256 ? Buffer.from(asset.sha256, 'hex') : null,
        },
      })
  }

  async delete(id: AssetId): Promise<void> {
    await this.db.delete(assets).where(eq(assets.id, id.value))
  }
}

function toDomain(row: AssetRow): Asset {
  return Asset.reconstitute(
    new AssetId(row.id),
    row.storageKey,
    row.mediaType,
    row.byteSize,
    row.sha256 ? Buffer.from(row.sha256).toString('hex') : null,
  )
}
