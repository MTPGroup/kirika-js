export interface S3ObjectStorageConfig {
  readonly bucket: string
  readonly region?: string
  readonly endpoint?: string
  readonly accessKeyId?: string
  readonly secretAccessKey?: string
  readonly sessionToken?: string
  readonly forcePathStyle?: boolean
}
