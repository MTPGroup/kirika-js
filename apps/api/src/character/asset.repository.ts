import {
  Asset,
  AssetId,
  type AssetRepositoryPort,
} from '@kirika-js/core/domain/character'
import { and, count, eq, inArray } from 'drizzle-orm'
import {
  assetOwners,
  assets,
  characterRevisionAssets,
} from '../db/character-schema'
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

  async grantOwnership(assetId: string, ownerId: string): Promise<void> {
    await this.db
      .insert(assetOwners)
      .values({ assetId, ownerId })
      .onConflictDoNothing()
  }

  async revokeOwnership(assetId: string, ownerId: string): Promise<void> {
    await this.db
      .delete(assetOwners)
      .where(
        and(eq(assetOwners.assetId, assetId), eq(assetOwners.ownerId, ownerId)),
      )
  }

  async isOwnedBy(assetId: string, ownerId: string): Promise<boolean> {
    const [row] = await this.db
      .select({ assetId: assetOwners.assetId })
      .from(assetOwners)
      .where(
        and(eq(assetOwners.assetId, assetId), eq(assetOwners.ownerId, ownerId)),
      )
      .limit(1)
    return row !== undefined
  }

  async areOwnedBy(
    assetIds: readonly string[],
    ownerId: string,
  ): Promise<boolean> {
    const uniqueIds = [...new Set(assetIds)]
    if (uniqueIds.length === 0) return true

    const rows = await this.db
      .select({ assetId: assetOwners.assetId })
      .from(assetOwners)
      .where(
        and(
          eq(assetOwners.ownerId, ownerId),
          inArray(assetOwners.assetId, uniqueIds),
        ),
      )
    return rows.length === uniqueIds.length
  }

  async listByOwner(ownerId: string, limit: number, offset: number) {
    const rows = await this.db
      .select({
        id: assets.id,
        storageKey: assets.storageKey,
        mediaType: assets.mediaType,
        byteSize: assets.byteSize,
        sha256: assets.sha256,
        createdAt: assetOwners.createdAt,
      })
      .from(assetOwners)
      .innerJoin(assets, eq(assets.id, assetOwners.assetId))
      .where(eq(assetOwners.ownerId, ownerId))
      .orderBy(assetOwners.createdAt)
      .limit(limit + 1)
      .offset(offset)

    const hasMore = rows.length > limit
    return {
      items: rows.slice(0, limit).map((row) => ({
        id: row.id,
        storageKey: row.storageKey,
        mediaType: row.mediaType,
        byteSize: row.byteSize,
        sha256: row.sha256 ? Buffer.from(row.sha256).toString('hex') : null,
        createdAt: row.createdAt,
      })),
      hasMore,
    }
  }

  async hasOwners(assetId: string): Promise<boolean> {
    const [row] = await this.db
      .select({ total: count() })
      .from(assetOwners)
      .where(eq(assetOwners.assetId, assetId))
    return (row?.total ?? 0) > 0
  }

  async isReferenced(assetId: string): Promise<boolean> {
    const [row] = await this.db
      .select({ assetId: characterRevisionAssets.assetId })
      .from(characterRevisionAssets)
      .where(eq(characterRevisionAssets.assetId, assetId))
      .limit(1)
    return row !== undefined
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
