import type { Asset, AssetId } from '../entities/assets.entity'

export const ASSET_REPOSITORY_PORT = Symbol('ASSET_REPOSITORY_PORT')

export interface AssetRepositoryPort {
  findById(id: AssetId): Promise<Asset | null>
  findBySha256(sha256: string): Promise<Asset | null>
  save(asset: Asset): Promise<void>
  delete(id: AssetId): Promise<void>
}
