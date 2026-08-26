import { mkdir, readFile, rm, stat, writeFile } from 'node:fs/promises'
import path from 'node:path'
import {
  type ObjectStoragePort,
  type PutObjectInput,
  StoredObjectNotFoundError,
} from '@kirika-js/core/storage'

export interface FilesystemObjectStorageOptions {
  readonly rootDir: string
}

export class FilesystemObjectStorage implements ObjectStoragePort {
  private readonly rootDir: string

  constructor(options: FilesystemObjectStorageOptions) {
    if (!options.rootDir.trim()) {
      throw new Error('Object storage rootDir 不能为空')
    }

    this.rootDir = path.resolve(options.rootDir)
  }

  async put(input: PutObjectInput): Promise<void> {
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
        throw new StoredObjectNotFoundError(key)
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
      await stat(filePath)
      return true
    } catch (error) {
      if (isNotFoundError(error)) {
        return false
      }
      throw error
    }
  }

  async getPublicUrl(_key: string): Promise<null> {
    return null
  }

  private resolveKey(key: string): string {
    const normalizedKey = normalizeKey(key)

    const filePath = path.resolve(this.rootDir, normalizedKey)

    const relative = path.relative(this.rootDir, filePath)

    if (relative.startsWith('..') || path.isAbsolute(relative)) {
      throw new Error(`Object key 不能逃逸 storage root: ${key}`)
    }

    return filePath
  }
}

function normalizeKey(key: string): string {
  const normalized = key.trim()

  if (!normalized) {
    throw new Error('Object key 不能为空')
  }

  if (normalized.includes('\0')) {
    throw new Error('Object key 包含非法字符')
  }

  if (path.isAbsolute(normalized)) {
    throw new Error(`Object key 不能是绝对路径: ${key}`)
  }

  return normalized
}

function isNotFoundError(error: unknown): error is NodeJS.ErrnoException {
  return error instanceof Error && 'code' in error && error.code === 'ENOENT'
}
