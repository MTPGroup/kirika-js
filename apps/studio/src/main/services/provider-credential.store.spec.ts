import { mkdtemp, readFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { ProviderCredentialStore } from './provider-credential.store'

const cipher = {
  isAvailable: () => true,
  isSecureBackend: () => true,
  encrypt: (value: string) => Buffer.from(`encrypted:${value}`),
  decrypt: (value: Buffer) => value.toString().replace('encrypted:', ''),
}

describe('ProviderCredentialStore', () => {
  it('encrypts credentials at rest and supports replacement and deletion', async () => {
    const directory = await mkdtemp(join(tmpdir(), 'kirika-credentials-'))
    const filePath = join(directory, 'credentials.json')
    const store = new ProviderCredentialStore(filePath, cipher)

    await store.set('workspace:provider', 'secret-key')
    expect(await store.get('workspace:provider')).toBe('secret-key')
    expect(await readFile(filePath, 'utf8')).not.toContain('secret-key')

    await store.set('workspace:provider', 'replacement')
    expect(await store.get('workspace:provider')).toBe('replacement')

    await store.delete('workspace:provider')
    expect(await store.get('workspace:provider')).toBeUndefined()
  })

  it('can remove a credential without decrypting damaged ciphertext', async () => {
    const directory = await mkdtemp(join(tmpdir(), 'kirika-credentials-'))
    const store = new ProviderCredentialStore(
      join(directory, 'credentials.json'),
      {
        ...cipher,
        decrypt: () => {
          throw new Error('damaged')
        },
      },
    )

    await store.set('key', 'secret')
    await expect(store.get('key')).rejects.toThrow('无法解密')
    await store.delete('key')
    expect(await store.has('key')).toBe(false)
  })

  it('fails closed when secure encryption is unavailable', async () => {
    const directory = await mkdtemp(join(tmpdir(), 'kirika-credentials-'))
    const store = new ProviderCredentialStore(
      join(directory, 'credentials.json'),
      {
        ...cipher,
        isAvailable: () => false,
      },
    )

    await expect(store.set('key', 'secret')).rejects.toThrow('安全存储')
  })

  it('rejects weak basic_text-style storage backends', async () => {
    const directory = await mkdtemp(join(tmpdir(), 'kirika-credentials-'))
    const store = new ProviderCredentialStore(
      join(directory, 'credentials.json'),
      {
        ...cipher,
        isSecureBackend: () => false,
      },
    )

    await expect(store.set('key', 'secret')).rejects.toThrow('basic_text')
  })
})
