export interface S3AssetStoreConfig {
  readonly bucket: string
  readonly region?: string
  readonly endpoint?: string
  readonly accessKeyId?: string
  readonly secretAccessKey?: string
  readonly sessionToken?: string
  readonly forcePathStyle?: boolean
}
