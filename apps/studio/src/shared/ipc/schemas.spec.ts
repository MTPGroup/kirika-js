import { describe, expect, it } from 'vitest'
import {
  characterChannels,
  conversationChannels,
  dialogChannels,
  generationChannels,
  lorebookChannels,
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

  it('validates advanced lorebook entries and bounded settings', () => {
    const schema = studioInputSchemas[lorebookChannels.replaceEntries]
    expect(
      schema.parse({
        lorebookId: 'book',
        name: '测试世界书',
        description: '',
        visibility: 'private',
        scanDepth: 20,
        tokenBudget: 2048,
        entries: [
          {
            keys: [],
            constant: true,
            title: '常驻',
            content: '内容',
            position: 'at_depth',
            insertionDepth: 2,
            probability: 100,
          },
        ],
      }),
    ).toMatchObject({
      name: '测试世界书',
      visibility: 'private',
      scanDepth: 20,
      tokenBudget: 2048,
    })
    expect(() =>
      schema.parse({
        lorebookId: 'book',
        scanDepth: 0,
        tokenBudget: 2048,
        entries: [],
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

  it('separates production and test conversation capabilities', () => {
    const common = {
      ownerDisplayName: 'User',
      characters: [
        {
          characterId: 'character',
          characterRevisionId: 'revision',
          displayName: 'Kirika',
        },
      ],
    }
    expect(
      studioInputSchemas[conversationChannels.create].parse(common),
    ).toEqual(common)
    expect(() =>
      studioInputSchemas[conversationChannels.create].parse({
        ...common,
        allowDraftCharacterRevision: true,
      }),
    ).toThrow()
    expect(
      studioInputSchemas[conversationChannels.createTest].parse({
        ...common,
        allowDraftCharacterRevision: true,
      }),
    ).toMatchObject({ allowDraftCharacterRevision: true })
  })

  it('separates production and test generation context overrides', () => {
    const common = {
      requestId: 'request',
      conversationId: 'conversation',
      providerId: 'provider',
    }
    const contextOverride = {
      includeCharacterLorebooks: false,
      lorebookRevisionIds: ['revision'],
    }
    expect(studioInputSchemas[generationChannels.start].parse(common)).toEqual(
      common,
    )
    expect(() =>
      studioInputSchemas[generationChannels.start].parse({
        ...common,
        contextOverride,
      }),
    ).toThrow()
    expect(
      studioInputSchemas[generationChannels.startTest].parse({
        ...common,
        characterId: 'character',
        characterRevisionId: 'revision',
        contextOverride,
      }),
    ).toMatchObject({ characterRevisionId: 'revision', contextOverride })
  })

  it('bounds complete character draft payloads', () => {
    const schema = studioInputSchemas[characterChannels.saveDraft]
    expect(
      schema.parse({
        characterId: 'character',
        alias: null,
        content: { name: 'Kirika', greetings: ['你好'] },
        assets: [],
        lorebooks: [],
      }),
    ).toMatchObject({ content: { name: 'Kirika' } })
    expect(() =>
      schema.parse({
        characterId: 'character',
        alias: null,
        content: { name: 'x'.repeat(201) },
        assets: [],
        lorebooks: [],
      }),
    ).toThrow()
    expect(() =>
      schema.parse({
        characterId: 'character',
        alias: null,
        content: { name: 'Kirika', greetings: Array(101).fill('hello') },
        assets: [],
        lorebooks: [],
      }),
    ).toThrow()
  })

  it('keeps character-card file paths out of renderer IPC', () => {
    expect(() =>
      studioInputSchemas[characterChannels.importCard].parse({
        formatHint: 'json',
        filePath: '/tmp/private.json',
      }),
    ).toThrow()
    expect(() =>
      studioInputSchemas[characterChannels.exportCard].parse({
        characterId: 'character',
        format: 'json',
        destinationPath: '/tmp/output.json',
      }),
    ).toThrow()
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
