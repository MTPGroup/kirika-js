/** biome-ignore-all lint/complexity/noStaticOnlyClass: 实例类允许只有静态方法 */
import { Asset, AssetId } from '@kirika-js/domain/character'

import type { assets } from '~/schema/asset.schema'

export type SqliteAssetRow = typeof assets.$inferSelect

export type SqliteAssetInsert = typeof assets.$inferInsert

export class SqliteAssetMapper {
  static toDomain(row: SqliteAssetRow): Asset {
    return Asset.reconstitute(
      new AssetId(row.id),
      row.storageKey,
      row.mediaType,
      row.byteSize,
      row.sha256 ? row.sha256.toString('hex') : null,
    )
  }

  static toPersistence(asset: Asset): SqliteAssetInsert {
    return {
      id: asset.id.value,
      storageKey: asset.storageKey,
      mediaType: asset.mediaType,
      byteSize: asset.byteSize,

      sha256: asset.sha256 ? Buffer.from(asset.sha256, 'hex') : null,
    }
  }
}
