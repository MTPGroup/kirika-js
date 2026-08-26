import { createHash } from 'node:crypto'
import { Asset } from '@kirika-js/core/domain/character'
import type { ObjectStoragePort } from '@kirika-js/core/storage'
import type { PgAssetRepository } from './asset.repository'

export interface UploadAssetInput {
  readonly data: Uint8Array
  readonly mediaType: string
}

export class AssetService {
  constructor(
    private readonly assets: PgAssetRepository,
    private readonly storage: ObjectStoragePort,
  ) {}

  async upload(ownerId: string, input: UploadAssetInput): Promise<Asset> {
    const sha256 = createHash('sha256').update(input.data).digest('hex')

    const existing = await this.assets.findBySha256(sha256)
    if (existing) {
      await this.assets.grantOwnership(existing.id.value, ownerId)
      return existing
    }

    const storageKey = `assets/${sha256}`
    await this.storage.put({
      key: storageKey,
      data: input.data,
      contentType: input.mediaType,
    })

    const asset = Asset.create(
      storageKey,
      input.mediaType,
      input.data.byteLength,
      sha256,
    )
    await this.assets.save(asset)
    await this.assets.grantOwnership(asset.id.value, ownerId)
    return asset
  }
}
