export interface PutAssetInput {
  readonly key: string
  readonly data: Uint8Array
  readonly contentType: string
}

export interface AssetStorePort {
  put(input: PutAssetInput): Promise<void>

  get(key: string): Promise<Uint8Array>

  delete(key: string): Promise<void>

  exists(key: string): Promise<boolean>
}
