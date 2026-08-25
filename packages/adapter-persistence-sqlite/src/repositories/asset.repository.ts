import type {
  Asset,
  AssetId,
  AssetRepositoryPort,
} from '@kirika-js/core/domain/character'
import { eq } from 'drizzle-orm'

import type { SqliteDatabase } from '~/database'
import { SqliteAssetMapper } from '~/mappers/asset.mapper'
import { assets } from '~/schema/asset.schema'

export class SqliteAssetRepository implements AssetRepositoryPort {
  constructor(private readonly db: SqliteDatabase) {}

  async findById(id: AssetId): Promise<Asset | null> {
    const [row] = await this.db
      .select()
      .from(assets)
      .where(eq(assets.id, id.value))
      .limit(1)

    return row ? SqliteAssetMapper.toDomain(row) : null
  }

  async findBySha256(sha256: string): Promise<Asset | null> {
    const digest = toSha256Buffer(sha256)

    const [row] = await this.db
      .select()
      .from(assets)
      .where(eq(assets.sha256, digest))
      .limit(1)

    return row ? SqliteAssetMapper.toDomain(row) : null
  }

  async save(asset: Asset): Promise<void> {
    const model = SqliteAssetMapper.toPersistence(asset)

    await this.db.insert(assets).values(model).onConflictDoNothing({
      target: assets.id,
    })
  }

  async delete(id: AssetId): Promise<void> {
    await this.db.delete(assets).where(eq(assets.id, id.value))
  }
}

function toSha256Buffer(value: string): Buffer {
  const normalized = value.trim().toLowerCase()

  if (!/^[a-f\d]{64}$/.test(normalized)) {
    throw new Error('SHA-256 必须是 64 位十六进制字符串')
  }

  return Buffer.from(normalized, 'hex')
}
