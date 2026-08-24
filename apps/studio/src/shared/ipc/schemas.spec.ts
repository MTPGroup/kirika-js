import { describe, expect, it } from 'vitest'
import {
  characterChannels,
  conversationChannels,
  dialogChannels,
  providerChannels,
  studioInputSchemas,
  workspaceChannels,
} from './index'

describe('Studio IPC Zod input schemas', () => {
  it('validates optional dialog input and file filters', () => {
    expect(
      studioInputSchemas[dialogChannels.selectDirectory].parse(undefined),
    ).toBeUndefined()
    expect(() =>
      studioInputSchemas[dialogChannels.selectFile].parse({
        filters: [{ name: 'JSON', extensions: [] }],
      }),
    ).toThrow()
  })

  it('trims and validates workspace paths', () => {
    expect(
      studioInputSchemas[workspaceChannels.open].parse({
        path: ' /tmp/workspace ',
      }),
    ).toEqual({ path: '/tmp/workspace' })
    expect(() =>
      studioInputSchemas[workspaceChannels.open].parse({ path: '' }),
    ).toThrow()
  })

  it('rejects malformed providers and validates API Key mutations', () => {
    const schema = studioInputSchemas[providerChannels.save]
    const valid = {
      name: 'Model',
      baseUrl: 'https://example.com/v1',
      defaultModel: 'm',
    }
    expect(() =>
      schema.parse({
        ...valid,
        baseUrl: 'not-url',
        apiKey: { action: 'clear' },
      }),
    ).toThrow()
    expect(() =>
      schema.parse({
        ...valid,
        baseUrl: 'https://user:pass@example.com/v1',
        apiKey: { action: 'clear' },
      }),
    ).toThrow()
    expect(
      schema.parse({ ...valid, apiKey: { action: 'replace', value: ' key ' } }),
    ).toEqual({ ...valid, apiKey: { action: 'replace', value: 'key' } })
    expect(() =>
      schema.parse({
        ...valid,
        apiKey: { action: 'clear' },
        secret: true,
      }),
    ).toThrow()
  })

  it('validates provider connection probing input', () => {
    const schema = studioInputSchemas[providerChannels.testConnection]
    expect(
      schema.parse({
        baseUrl: 'http://localhost:11434/v1',
        apiKey: { action: 'clear' },
      }),
    ).toEqual({
      baseUrl: 'http://localhost:11434/v1',
      apiKey: { action: 'clear' },
    })
  })

  it('keeps null and undefined parent message semantics distinct', () => {
    const schema = studioInputSchemas[conversationChannels.sendHumanMessage]
    expect(
      schema.parse({ conversationId: 'c', content: 'hello' }).parentMessageId,
    ).toBeUndefined()
    expect(
      schema.parse({
        conversationId: 'c',
        parentMessageId: null,
        content: 'hello',
      }).parentMessageId,
    ).toBeNull()
  })

  it('rejects unknown character patch fields', () => {
    expect(() =>
      studioInputSchemas[characterChannels.updateDraft].parse({
        characterId: 'c',
        patch: { unknown: true },
      }),
    ).toThrow()
  })
})
