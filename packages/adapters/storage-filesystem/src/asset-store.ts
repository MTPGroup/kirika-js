import { mkdir, readFile, rm, stat, writeFile } from 'node:fs/promises'
import path from 'node:path'

import type { AssetStorePort, PutAssetInput } from '@kirika-js/core/domain'

export interface FilesystemAssetStoreOptions {
  readonly rootDir: string
}

export class FilesystemAssetStore implements AssetStorePort {
  private readonly rootDir: string

  constructor(options: FilesystemAssetStoreOptions) {
    if (!options.rootDir.trim()) {
      throw new Error('Asset storage rootDir 不能为空')
    }

    this.rootDir = path.resolve(options.rootDir)
  }

  async put(input: PutAssetInput): Promise<void> {
    const filePath = this.resolveKey(input.key)

    await mkdir(path.dirname(filePath), {
      recursive: true,
    })

    await writeFile(filePath, input.data)
  }

  async get(key: string): Promise<Uint8Array> {
    const filePath = this.resolveKey(key)

    try {
      const data = await readFile(filePath)

      return new Uint8Array(data.buffer, data.byteOffset, data.byteLength)
    } catch (error) {
      if (isNotFoundError(error)) {
        throw new AssetObjectNotFoundError(key)
      }

      throw error
    }
  }

  async delete(key: string): Promise<void> {
    const filePath = this.resolveKey(key)

    await rm(filePath, {
      force: true,
    })
  }

  async exists(key: string): Promise<boolean> {
    const filePath = this.resolveKey(key)

    try {
      const info = await stat(filePath)

      return info.isFile()
    } catch (error) {
      if (isNotFoundError(error)) {
        return false
      }

      throw error
    }
  }

  private resolveKey(key: string): string {
    const normalizedKey = normalizeKey(key)

    const filePath = path.resolve(this.rootDir, normalizedKey)

    const relative = path.relative(this.rootDir, filePath)

    if (relative.startsWith('..') || path.isAbsolute(relative)) {
      throw new Error(`Asset key 不能逃逸 storage root: ${key}`)
    }

    return filePath
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
    throw new Error('Asset key 不能为空')
  }

  if (normalized.includes('\0')) {
    throw new Error('Asset key 包含非法字符')
  }

  if (path.isAbsolute(normalized)) {
    throw new Error(`Asset key 不能是绝对路径: ${key}`)
  }

  return normalized
}

function isNotFoundError(error: unknown): error is NodeJS.ErrnoException {
  return error instanceof Error && 'code' in error && error.code === 'ENOENT'
}
