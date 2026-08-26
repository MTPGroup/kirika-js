export interface PutObjectInput {
  readonly key: string
  readonly data: Uint8Array
  readonly contentType: string
}

export interface ObjectStoragePort {
  put(input: PutObjectInput): Promise<void>

  get(key: string): Promise<Uint8Array>

  delete(key: string): Promise<void>

  exists(key: string): Promise<boolean>

  /** 公开读场景下的可访问 URL；无公开访问能力时返回 null。 */
  getPublicUrl(key: string): Promise<string | null>
}
