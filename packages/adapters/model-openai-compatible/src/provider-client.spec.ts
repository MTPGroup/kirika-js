import type OpenAI from 'openai'
import { describe, expect, it, vi } from 'vitest'
import { OpenAICompatibleProviderClient } from './provider-client'

describe('OpenAICompatibleProviderClient', () => {
  it('lists, deduplicates, and sorts remote models', async () => {
    const list = vi.fn(async () => ({
      data: [
        { id: 'z-model', owned_by: 'vendor' },
        { id: 'a-model', owned_by: 'vendor' },
        { id: 'z-model', owned_by: 'vendor' },
      ],
    }))
    const client = new OpenAICompatibleProviderClient({
      baseUrl: 'https://example.com/v1',
      client: { models: { list } } as unknown as OpenAI,
    })

    await expect(client.listModels()).resolves.toEqual([
      { id: 'a-model', ownedBy: 'vendor' },
      { id: 'z-model', ownedBy: 'vendor' },
    ])
  })
})
