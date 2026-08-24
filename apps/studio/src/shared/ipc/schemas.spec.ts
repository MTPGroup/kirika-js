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

  it('rejects malformed providers and extra properties', () => {
    const schema = studioInputSchemas[providerChannels.save]
    expect(() =>
      schema.parse({ name: 'Model', baseUrl: 'not-url', defaultModel: 'm' }),
    ).toThrow()
    expect(() =>
      schema.parse({
        name: 'Model',
        baseUrl: 'https://example.com/v1',
        defaultModel: 'm',
        secret: true,
      }),
    ).toThrow()
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
