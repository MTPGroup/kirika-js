import { mkdtemp, readFile, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { ProviderCredentialStore } from './provider-credential.store'
import { WorkspaceSettingsStore } from './workspace-settings.store'

const cipher = {
  isAvailable: () => true,
  isSecureBackend: () => true,
  encrypt: (value: string) => Buffer.from(`encrypted:${value}`),
  decrypt: (value: Buffer) => value.toString().replace('encrypted:', ''),
}

async function setup() {
  const directory = await mkdtemp(join(tmpdir(), 'kirika-workspace-'))
  const credentialsPath = join(directory, 'credentials.json')
  const credentials = new ProviderCredentialStore(credentialsPath, cipher)
  return { directory, credentialsPath, credentials }
}

describe('WorkspaceSettingsStore provider credentials', () => {
  it('migrates legacy plaintext API keys out of workspace.json', async () => {
    const { directory, credentialsPath, credentials } = await setup()
    await writeFile(
      join(directory, 'workspace.json'),
      JSON.stringify({
        version: 1,
        name: 'Test',
        ownerId: 'owner',
        activeCharacterId: null,
        activeConversationId: null,
        providers: [
          {
            id: 'provider',
            name: 'Provider',
            baseUrl: 'https://example.com/v1',
            apiKey: 'legacy-secret',
            defaultModel: 'model',
            enabled: true,
          },
        ],
      }),
    )

    const store = await WorkspaceSettingsStore.open(directory, credentials)

    expect(await store.getProviderApiKey('provider')).toBe('legacy-secret')
    expect(await readFile(join(directory, 'workspace.json'), 'utf8')).not.toContain('legacy-secret')
    expect(await readFile(credentialsPath, 'utf8')).not.toContain('legacy-secret')
    expect((await store.listProviders())[0]?.hasApiKey).toBe(true)
  })

  it('supports explicit replace, retain, and clear operations', async () => {
    const { directory, credentials } = await setup()
    const store = await WorkspaceSettingsStore.open(directory, credentials, 'Test')
    const created = await store.saveProvider({
      name: 'Provider',
      baseUrl: 'https://example.com/v1',
      apiKey: { action: 'replace', value: 'secret' },
      defaultModel: 'model',
    })

    await store.saveProvider({
      id: created.id,
      name: 'Renamed',
      baseUrl: created.baseUrl,
      apiKey: { action: 'retain' },
      defaultModel: created.defaultModel,
    })
    expect(await store.getProviderApiKey(created.id)).toBe('secret')

    const cleared = await store.saveProvider({
      id: created.id,
      name: 'Renamed',
      baseUrl: created.baseUrl,
      apiKey: { action: 'clear' },
      defaultModel: created.defaultModel,
    })
    expect(cleared.hasApiKey).toBe(false)
    expect(await store.getProviderApiKey(created.id)).toBeUndefined()
  })

  it('rejects sending a retained key to a changed Base URL', async () => {
    const { directory, credentials } = await setup()
    const store = await WorkspaceSettingsStore.open(directory, credentials, 'Test')
    const created = await store.saveProvider({
      name: 'Provider',
      baseUrl: 'https://example.com/v1',
      apiKey: { action: 'replace', value: 'secret' },
      defaultModel: 'model',
    })

    await expect(
      store.saveProvider({
        id: created.id,
        name: created.name,
        baseUrl: 'https://attacker.example/v1',
        apiKey: { action: 'retain' },
        defaultModel: created.defaultModel,
      }),
    ).rejects.toThrow('Base URL 已更改')
  })

  it('persists enabled changes and deletes provider credentials', async () => {
    const { directory, credentials } = await setup()
    const store = await WorkspaceSettingsStore.open(directory, credentials, 'Test')
    const created = await store.saveProvider({
      name: 'Provider',
      baseUrl: 'https://example.com/v1',
      apiKey: { action: 'replace', value: 'secret' },
      defaultModel: 'model',
      enabled: true,
    })

    const disabled = await store.saveProvider({
      id: created.id,
      name: created.name,
      baseUrl: created.baseUrl,
      apiKey: { action: 'retain' },
      defaultModel: created.defaultModel,
      generation: created.generation,
      enabled: false,
    })
    expect(disabled.enabled).toBe(false)
    expect((await store.listProviders())[0]?.enabled).toBe(false)

    await store.deleteProvider(created.id)
    expect(await store.listProviders()).toEqual([])
    expect(await store.getProviderApiKey(created.id)).toBeUndefined()
  })

  it('rejects retain for a new provider', async () => {
    const { directory, credentials } = await setup()
    const store = await WorkspaceSettingsStore.open(directory, credentials, 'Test')

    await expect(
      store.saveProvider({
        name: 'Provider',
        baseUrl: 'https://example.com/v1',
        apiKey: { action: 'retain' },
        defaultModel: 'model',
      }),
    ).rejects.toThrow('不能保留')
  })
})
