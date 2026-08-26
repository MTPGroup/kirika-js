import {
  DeleteObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  PutObjectCommand,
  S3Client,
  S3ServiceException,
} from '@aws-sdk/client-s3'
import {
  type ObjectStoragePort,
  type PutObjectInput,
  StoredObjectNotFoundError,
} from '@kirika-js/core/storage'
import type { S3ObjectStorageConfig } from './config'

export class S3ObjectStorage implements ObjectStoragePort {
  private readonly client: S3Client
  private readonly bucket: string
  private readonly endpoint: string | undefined
  private readonly region: string
  private readonly forcePathStyle: boolean

  constructor(config: S3ObjectStorageConfig) {
    const bucket = config.bucket.trim()
    const endpoint = normalizeOptionalString(config.endpoint)
    const region = config.region ?? 'us-east-1'
    const forcePathStyle = config.forcePathStyle ?? false

    if (!bucket) {
      throw new Error('S3 bucket 不能为空')
    }

    assertCredentialConfig(config)

    this.bucket = bucket
    this.endpoint = endpoint
    this.region = region
    this.forcePathStyle = forcePathStyle

    this.client = new S3Client({
      region,
      endpoint,
      forcePathStyle,
      credentials:
        config.accessKeyId && config.secretAccessKey
          ? {
              accessKeyId: config.accessKeyId,
              secretAccessKey: config.secretAccessKey,
              ...(config.sessionToken
                ? {
                    sessionToken: config.sessionToken,
                  }
                : {}),
            }
          : undefined,
    })
  }

  async put(input: PutObjectInput): Promise<void> {
    const key = normalizeKey(input.key)

    const contentType = input.contentType.trim()

    if (!contentType) {
      throw new Error('Object contentType 不能为空')
    }

    await this.client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: input.data,
        ContentType: contentType,
      }),
    )
  }

  async get(key: string): Promise<Uint8Array> {
    const normalizedKey = normalizeKey(key)

    try {
      const result = await this.client.send(
        new GetObjectCommand({
          Bucket: this.bucket,
          Key: normalizedKey,
        }),
      )

      if (!result.Body) {
        throw new Error(`S3 对象响应缺少 Body: ${normalizedKey}`)
      }

      return await result.Body.transformToByteArray()
    } catch (error) {
      if (isNotFound(error)) {
        throw new StoredObjectNotFoundError(normalizedKey)
      }

      throw error
    }
  }

  async delete(key: string): Promise<void> {
    const normalizedKey = normalizeKey(key)

    await this.client.send(
      new DeleteObjectCommand({
        Bucket: this.bucket,
        Key: normalizedKey,
      }),
    )
  }

  async exists(key: string): Promise<boolean> {
    const normalizedKey = normalizeKey(key)

    try {
      await this.client.send(
        new HeadObjectCommand({
          Bucket: this.bucket,
          Key: normalizedKey,
        }),
      )

      return true
    } catch (error) {
      if (isNotFound(error)) {
        return false
      }

      throw error
    }
  }

  async getPublicUrl(key: string): Promise<string | null> {
    const normalizedKey = normalizeKey(key)
    return buildPublicUrl(
      this.endpoint,
      this.region,
      this.forcePathStyle,
      this.bucket,
      normalizedKey,
    )
  }

  dispose(): void {
    this.client.destroy()
  }
}

function normalizeKey(key: string): string {
  const normalized = key.trim()

  if (!normalized) {
    throw new Error('S3 object key 不能为空')
  }

  return normalized
}

function buildPublicUrl(
  endpoint: string | undefined,
  region: string,
  forcePathStyle: boolean,
  bucket: string,
  key: string,
): string {
  const encodedKey = key.split('/').map(encodeURIComponent).join('/')

  if (endpoint) {
    const base = endpoint.replace(/\/+$/, '')
    if (forcePathStyle) {
      return `${base}/${bucket}/${encodedKey}`
    }
    const url = new URL(endpoint)
    return `${url.protocol}//${bucket}.${url.host}/${encodedKey}`
  }

  const host =
    region === 'us-east-1' ? 's3.amazonaws.com' : `s3.${region}.amazonaws.com`
  if (forcePathStyle) {
    return `https://${host}/${bucket}/${encodedKey}`
  }
  return `https://${bucket}.${host}/${encodedKey}`
}

function normalizeOptionalString(
  value: string | undefined,
): string | undefined {
  const normalized = value?.trim() ?? ''

  return normalized || undefined
}

function assertCredentialConfig(config: S3ObjectStorageConfig): void {
  const hasAccessKey = Boolean(config.accessKeyId)

  const hasSecretKey = Boolean(config.secretAccessKey)

  if (hasAccessKey !== hasSecretKey) {
    throw new Error('S3 accessKeyId 和 secretAccessKey 必须同时提供')
  }

  if (config.sessionToken && (!hasAccessKey || !hasSecretKey)) {
    throw new Error(
      'S3 sessionToken 需要同时提供 accessKeyId 和 secretAccessKey',
    )
  }
}

function isNotFound(error: unknown): boolean {
  if (!(error instanceof S3ServiceException)) {
    return false
  }

  return (
    error.$metadata.httpStatusCode === 404 ||
    error.name === 'NoSuchKey' ||
    error.name === 'NotFound'
  )
}
