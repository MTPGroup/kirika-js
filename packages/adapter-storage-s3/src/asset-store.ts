import {
  DeleteObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  PutObjectCommand,
  S3Client,
  S3ServiceException,
} from '@aws-sdk/client-s3'

import type { AssetStorePort, PutAssetInput } from '@kirika-js/domain'

import type { S3AssetStoreConfig } from './config'

export class S3AssetStore implements AssetStorePort {
  private readonly client: S3Client
  private readonly bucket: string

  constructor(config: S3AssetStoreConfig) {
    const bucket = config.bucket.trim()

    if (!bucket) {
      throw new Error('S3 bucket 不能为空')
    }

    assertCredentialConfig(config)

    this.bucket = bucket

    this.client = new S3Client({
      region: config.region ?? 'us-east-1',

      endpoint: normalizeOptionalString(config.endpoint),

      forcePathStyle: config.forcePathStyle ?? false,

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

  async put(input: PutAssetInput): Promise<void> {
    const key = normalizeKey(input.key)

    const contentType = input.contentType.trim()

    if (!contentType) {
      throw new Error('Asset contentType 不能为空')
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
        throw new AssetObjectNotFoundError(normalizedKey)
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

  dispose(): void {
    this.client.destroy()
  }
}

export class AssetObjectNotFoundError extends Error {
  readonly key: string

  constructor(key: string) {
    super(`Asset 不存在: ${key}`)

    this.name = 'AssetObjectNotFoundError'

    this.key = key
  }
}

function normalizeKey(key: string): string {
  const normalized = key.trim()

  if (!normalized) {
    throw new Error('S3 object key 不能为空')
  }

  return normalized
}

function normalizeOptionalString(
  value: string | undefined,
): string | undefined {
  const normalized = value?.trim() ?? ''

  return normalized || undefined
}

function assertCredentialConfig(config: S3AssetStoreConfig): void {
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
