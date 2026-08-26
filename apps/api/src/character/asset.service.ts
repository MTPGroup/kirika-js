import { createHash } from 'node:crypto'
import {
  Asset,
  type AssetRepositoryPort,
} from '@kirika-js/core/domain/character'
import type { ObjectStoragePort } from '@kirika-js/core/storage'

export interface UploadAssetInput {
  readonly data: Uint8Array
  readonly mediaType: string
}

export class AssetService {
  constructor(
    private readonly assets: AssetRepositoryPort,
    private readonly storage: ObjectStoragePort,
  ) {}

  async upload(input: UploadAssetInput): Promise<Asset> {
    const sha256 = createHash('sha256').update(input.data).digest('hex')

    const existing = await this.assets.findBySha256(sha256)
    if (existing) return existing

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
    return asset
  }
}
