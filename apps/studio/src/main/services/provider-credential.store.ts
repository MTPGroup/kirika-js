import { mkdir, readFile, rename, writeFile } from 'node:fs/promises'
import { dirname } from 'node:path'
import { safeStorage } from 'electron'

interface CredentialFile {
  version: 1
  credentials: Record<string, string>
}

interface CredentialCipher {
  isAvailable(): boolean
  isSecureBackend(): boolean
  encrypt(value: string): Buffer
  decrypt(value: Buffer): string
}

const electronCipher: CredentialCipher = {
  isAvailable: () => safeStorage.isEncryptionAvailable(),
  isSecureBackend: () =>
    process.platform !== 'linux' ||
    safeStorage.getSelectedStorageBackend() !== 'basic_text',
  encrypt: (value) => safeStorage.encryptString(value),
  decrypt: (value) => safeStorage.decryptString(value),
}

export class ProviderCredentialStore {
  private operation: Promise<void> = Promise.resolve()

  constructor(
    readonly filePath: string,
    private readonly cipher: CredentialCipher = electronCipher,
  ) {}

  async get(key: string): Promise<string | undefined> {
    const encrypted = await this.snapshot(key)
    if (!encrypted) return undefined
    this.assertSecureStorage()
    try {
      return this.cipher.decrypt(Buffer.from(encrypted, 'base64'))
    } catch {
      throw new Error('模型凭据无法解密，请重新输入或清除 API Key')
    }
  }

  async set(key: string, apiKey: string): Promise<void> {
    this.assertSecureStorage()
    await this.mutate((data) => {
      data.credentials[key] = this.cipher.encrypt(apiKey).toString('base64')
    })
  }

  async delete(key: string): Promise<void> {
    await this.mutate((data) => {
      delete data.credentials[key]
    })
  }

  async has(key: string): Promise<boolean> {
    return Boolean(await this.snapshot(key))
  }

  async snapshot(key: string): Promise<string | undefined> {
    await this.operation
    return (await this.read()).credentials[key]
  }

  async restore(key: string, encrypted: string | undefined): Promise<void> {
    await this.mutate((data) => {
      if (encrypted) data.credentials[key] = encrypted
      else delete data.credentials[key]
    })
  }

  private assertSecureStorage() {
    if (!this.cipher.isAvailable()) {
      throw new Error('系统安全存储当前不可用，无法使用 API Key')
    }
    if (!this.cipher.isSecureBackend()) {
      throw new Error('当前 Linux 安全存储后端为 basic_text，拒绝保存 API Key')
    }
  }

  private async mutate(change: (data: CredentialFile) => void): Promise<void> {
    const next = this.operation.then(async () => {
      const data = await this.read()
      change(data)
      await this.write(data)
    })
    this.operation = next.catch(() => undefined)
    await next
  }

  private async read(): Promise<CredentialFile> {
    try {
      const parsed = JSON.parse(
        await readFile(this.filePath, 'utf8'),
      ) as Partial<CredentialFile>
      return {
        version: 1,
        credentials:
          parsed.credentials && typeof parsed.credentials === 'object'
            ? parsed.credentials
            : {},
      }
    } catch (error) {
      if (
        error instanceof Error &&
        'code' in error &&
        error.code === 'ENOENT'
      ) {
        return { version: 1, credentials: {} }
      }
      throw error
    }
  }

  private async write(data: CredentialFile): Promise<void> {
    await mkdir(dirname(this.filePath), { recursive: true })
    const temporaryPath = `${this.filePath}.tmp`
    await writeFile(temporaryPath, JSON.stringify(data, null, 2), {
      encoding: 'utf8',
      mode: 0o600,
    })
    await rename(temporaryPath, this.filePath)
  }
}
