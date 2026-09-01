import { z } from 'zod'
import type { StudioChannel } from './channels'
import { characterChannels } from './character'
import { conversationChannels } from './conversation'
import { dialogChannels } from './dialog'
import { generationChannels } from './generation'
import { lorebookChannels } from './lorebook'
import { profileChannels } from './profile'
import { providerChannels } from './provider'
import { windowChannels } from './window'
import { workspaceChannels } from './workspace'

const nonEmpty = z.string().trim().min(1)
const id = nonEmpty
const optionalText = z.string().optional()
const apiKeyUpdate = z.discriminatedUnion('action', [
  z.object({ action: z.literal('retain') }).strict(),
  z.object({ action: z.literal('replace'), value: nonEmpty.max(16_384) }).strict(),
  z.object({ action: z.literal('clear') }).strict(),
])
const providerUrl = z.url().refine((value) => {
  const url = new URL(value)
  return (url.protocol === 'http:' || url.protocol === 'https:') && !url.username && !url.password
}, '必须是无用户凭据的 HTTP 或 HTTPS URL')
const providerConnection = z
  .object({
    providerId: id.optional(),
    baseUrl: providerUrl,
    apiKey: apiKeyUpdate,
    model: nonEmpty.optional(),
  })
  .strict()
const generation = z
  .object({
    maxOutputTokens: z.number().int().positive().optional(),
    temperature: z.number().min(0).max(2).optional(),
    topP: z.number().min(0).max(1).optional(),
    stopSequences: z.array(z.string()).optional(),
    seed: z.number().int().optional(),
  })
  .strict()

const characterId = z.object({ characterId: id }).strict()
const lorebookId = z.object({ lorebookId: id }).strict()
const conversationId = z.object({ conversationId: id }).strict()
const characterContent = {
  name: nonEmpty.max(200),
  description: z.string().max(100_000).optional(),
  personality: z.string().max(100_000).optional(),
  scenario: z.string().max(100_000).optional(),
  systemPrompt: z.string().max(100_000).optional(),
  postHistoryInstructions: z.string().max(100_000).optional(),
  greetings: z.array(z.string().max(20_000)).max(100).optional(),
  examples: z.array(z.string().max(50_000)).max(100).optional(),
  extensions: z.record(z.string(), z.unknown()).optional(),
}
const characterAsset = z
  .object({
    assetId: id,
    kind: z.enum(['avatar', 'background', 'emotion', 'audio', 'video', 'model', 'other']),
    name: nonEmpty.max(200),
    uri: nonEmpty.max(4096),
    ordinal: z.number().int().nonnegative().max(10_000),
    extensions: z.record(z.string(), z.unknown()),
  })
  .strict()
const characterLorebookReference = z
  .object({
    lorebookRevisionId: id,
    ordinal: z.number().int().nonnegative().max(10_000),
    enabled: z.boolean(),
  })
  .strict()
const characterParticipant = z
  .object({ characterId: id, characterRevisionId: id, displayName: nonEmpty })
  .strict()
const assetPart = z
  .object({
    type: z.literal('asset'),
    assetId: id,
    modality: z.enum(['image', 'audio', 'video', 'file']),
    mediaType: nonEmpty,
    altText: z.string().nullable(),
  })
  .strict()
const messagePart = z.discriminatedUnion('type', [
  z.object({ type: z.literal('text'), text: z.string() }).strict(),
  assetPart,
])
const lorebookEntry = z
  .object({
    id: id.optional(),
    keys: z.array(nonEmpty).max(100),
    secondaryKeys: z.array(nonEmpty).max(100).optional(),
    title: nonEmpty.max(200),
    enabled: z.boolean().optional(),
    constant: z.boolean().optional(),
    content: nonEmpty.max(100_000),
    position: z.enum(['before_history', 'after_history', 'at_depth']),
    insertionDepth: z.number().int().min(0).max(1000).optional(),
    priority: z.number().int().optional(),
    matchMode: z.enum(['any', 'all']).optional(),
    caseSensitive: z.boolean().optional(),
    matchWholeWords: z.boolean().optional(),
    probability: z.number().int().min(0).max(100).optional(),
  })
  .strict()

const dialogOptions = z
  .object({
    title: z.string().max(200).optional(),
    defaultPath: z.string().max(4096).optional(),
  })
  .strict()
const fileFilters = z
  .array(z.object({ name: nonEmpty, extensions: z.array(nonEmpty).min(1).max(20) }).strict())
  .max(20)
  .optional()

export const studioInputSchemas = {
  [profileChannels.saveAvatar]: z
    .object({
      dataUrl: z.string().startsWith('data:image/png;base64,').max(6_000_000),
    })
    .strict(),
  [dialogChannels.selectDirectory]: dialogOptions.optional(),
  [dialogChannels.selectFile]: dialogOptions.extend({ filters: fileFilters }).optional(),
  [dialogChannels.saveFile]: dialogOptions.extend({
    filters: fileFilters,
    defaultName: z.string().max(255).optional(),
  }),
  [workspaceChannels.open]: z.object({ path: nonEmpty }).strict(),
  [workspaceChannels.create]: z.object({ path: nonEmpty, name: optionalText }).strict(),
  [windowChannels.updateTitleBarOverlay]: z
    .object({
      color: z.string().min(1).max(64),
      symbolColor: z.string().min(1).max(64),
    })
    .strict(),
  [providerChannels.save]: z
    .object({
      id: id.optional(),
      name: nonEmpty,
      baseUrl: providerUrl,
      type: z.literal('openai-compatible').optional(),
      apiKey: apiKeyUpdate,
      defaultModel: nonEmpty,
      generation: generation.optional(),
      enabled: z.boolean().optional(),
    })
    .strict(),
  [providerChannels.delete]: z.object({ id }).strict(),
  [providerChannels.testConnection]: providerConnection,
  [providerChannels.listModels]: providerConnection,
  [characterChannels.create]: z
    .object({ ...characterContent, alias: z.string().nullable().optional() })
    .strict(),
  [characterChannels.get]: characterId,
  [characterChannels.delete]: characterId,
  [characterChannels.updateDraft]: z
    .object({
      characterId: id,
      patch: z
        .object({ ...characterContent })
        .partial()
        .strict(),
    })
    .strict(),
  [characterChannels.saveDraft]: z
    .object({
      characterId: id,
      alias: z.string().max(200).nullable(),
      content: z.object(characterContent).strict(),
      assets: z.array(characterAsset).max(500),
      lorebooks: z.array(characterLorebookReference).max(100),
    })
    .strict(),
  [characterChannels.replaceGreetings]: z
    .object({ characterId: id, greetings: z.array(z.string()) })
    .strict(),
  [characterChannels.replaceExamples]: z
    .object({ characterId: id, examples: z.array(z.string()) })
    .strict(),
  [characterChannels.importAsset]: z
    .object({
      characterId: id,
      kind: z.enum(['avatar', 'background', 'emotion', 'audio', 'video', 'model', 'other']),
    })
    .strict(),
  [characterChannels.replaceAssets]: z
    .object({
      characterId: id,
      assets: z.array(characterAsset).max(500),
    })
    .strict(),
  [characterChannels.replaceLorebooks]: z
    .object({
      characterId: id,
      lorebooks: z.array(characterLorebookReference).max(100),
    })
    .strict(),
  [characterChannels.createDraft]: characterId,
  [characterChannels.publish]: z.object({ characterId: id, revisionId: id }).strict(),
  [characterChannels.importCard]: z.object({ formatHint: z.literal('json').optional() }).strict(),
  [characterChannels.exportCard]: z
    .object({
      characterId: id,
      revisionId: id.optional(),
      format: z.literal('json'),
    })
    .strict(),
  [lorebookChannels.create]: z.object({ name: nonEmpty, description: optionalText }).strict(),
  [lorebookChannels.get]: lorebookId,
  [lorebookChannels.delete]: lorebookId,
  [lorebookChannels.updateMetadata]: z
    .object({ lorebookId: id, name: nonEmpty, description: z.string() })
    .strict(),
  [lorebookChannels.changeVisibility]: z
    .object({
      lorebookId: id,
      visibility: z.enum(['private', 'unlisted', 'public']),
    })
    .strict(),
  [lorebookChannels.createDraft]: lorebookId,
  [lorebookChannels.replaceEntries]: z
    .object({
      lorebookId: id,
      name: nonEmpty.max(200),
      description: z.string().max(10_000),
      visibility: z.enum(['private', 'unlisted', 'public']),
      scanDepth: z.number().int().min(1).max(1000),
      tokenBudget: z.number().int().min(1).max(1_000_000),
      entries: z.array(lorebookEntry).max(10_000),
    })
    .strict(),
  [lorebookChannels.publish]: z.object({ lorebookId: id, revisionId: id }).strict(),
  [conversationChannels.create]: z
    .object({
      title: z.string().nullable().optional(),
      mode: z.enum(['direct', 'group']).optional(),
      turnPolicy: z.enum(['manual', 'round_robin', 'auto']).optional(),
      ownerDisplayName: nonEmpty,
      characters: z.array(characterParticipant).min(1),
    })
    .strict(),
  [conversationChannels.createTest]: z
    .object({
      title: z.string().nullable().optional(),
      mode: z.enum(['direct', 'group']).optional(),
      turnPolicy: z.enum(['manual', 'round_robin', 'auto']).optional(),
      ownerDisplayName: nonEmpty,
      characters: z.array(characterParticipant).min(1),
      allowDraftCharacterRevision: z.boolean(),
    })
    .strict(),
  [conversationChannels.get]: conversationId,
  [conversationChannels.getHistory]: z
    .object({ conversationId: id, leafMessageId: id.optional() })
    .strict(),
  [conversationChannels.delete]: conversationId,
  [conversationChannels.rename]: z
    .object({ conversationId: id, title: z.string().nullable() })
    .strict(),
  [conversationChannels.changeTurnPolicy]: z
    .object({
      conversationId: id,
      turnPolicy: z.enum(['manual', 'round_robin', 'auto']),
    })
    .strict(),
  [conversationChannels.addCharacter]: z
    .object({ conversationId: id, participant: characterParticipant })
    .strict(),
  [conversationChannels.removeParticipant]: z
    .object({ conversationId: id, participantId: id })
    .strict(),
  [conversationChannels.renameParticipant]: z
    .object({ conversationId: id, participantId: id, displayName: nonEmpty })
    .strict(),
  [conversationChannels.sendHumanMessage]: z
    .object({
      conversationId: id,
      parentMessageId: id.nullable().optional(),
      content: z.union([nonEmpty, z.array(messagePart).min(1)]),
    })
    .strict(),
  [conversationChannels.selectBranch]: z.object({ conversationId: id, leafMessageId: id }).strict(),
  [conversationChannels.archive]: conversationId,
  [conversationChannels.restore]: conversationId,
  [generationChannels.start]: z
    .object({
      requestId: id,
      conversationId: id,
      providerId: id,
      model: nonEmpty.optional(),
      speakerParticipantId: id.optional(),
      generation: generation.optional(),
    })
    .strict(),
  [generationChannels.startTest]: z
    .object({
      requestId: id,
      conversationId: id,
      providerId: id,
      model: nonEmpty.optional(),
      speakerParticipantId: id.optional(),
      generation: generation.optional(),
      characterId: id,
      characterRevisionId: id,
      contextOverride: z
        .object({
          includeCharacterLorebooks: z.boolean(),
          lorebookRevisionIds: z.array(id).max(100),
        })
        .strict(),
    })
    .strict(),
  [generationChannels.abort]: z.object({ requestId: id }).strict(),
} satisfies Partial<Record<StudioChannel, z.ZodType>>

export const generationEventSchema = z.looseObject({
  type: z.enum([
    'preparing',
    'started',
    'text_delta',
    'content_part',
    'completed',
    'failed',
    'cancelled',
  ]),
  requestId: nonEmpty,
  messageId: z.string(),
})

export type InputStudioChannel = keyof typeof studioInputSchemas
