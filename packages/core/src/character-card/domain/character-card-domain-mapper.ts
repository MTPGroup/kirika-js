import {
  type AssetId,
  CharacterLorebookReference,
  type CharacterRevision,
  CharacterRevisionAsset,
  type CharacterRevisionContent,
} from '../../domain/character'
import type { LorebookRevisionId } from '../../domain/lorebook'
import { CharacterCardResourceMappingError } from '../errors'
import {
  type CharacterCardAsset,
  type CharacterCardDocument,
  type CharacterCardDocumentInput,
  type CharacterCardLorebook,
  type CharacterCardLorebookEntryInput,
  createCharacterCardDocument,
} from '../model/character-card-document'

type MaybePromise<T> = T | Promise<T>

export interface CharacterCardResourceImporter {
  importAsset?(
    asset: CharacterCardAsset,
  ): MaybePromise<ImportedCharacterCardAsset>

  importLorebook?(
    lorebook: CharacterCardLorebook,
  ): MaybePromise<LorebookRevisionId>
}

export interface ImportedCharacterCardAsset {
  readonly assetId: AssetId
  readonly uri: string
  readonly extensions?: Readonly<Record<string, unknown>>
}

export interface ExportedCharacterCardAsset {
  readonly uri?: string
  readonly mediaType?: string
  readonly data?: Uint8Array
  readonly extensions?: Readonly<Record<string, unknown>>
}

export interface ExportedCharacterCardLorebook {
  readonly name?: string
  readonly description?: string
  readonly entries: readonly CharacterCardLorebookEntryInput[]
  readonly extensions?: Readonly<Record<string, unknown>>
}

export interface CharacterCardResourceExporter {
  exportAsset?(
    asset: CharacterRevisionAsset,
  ): MaybePromise<ExportedCharacterCardAsset>

  exportLorebook?(
    reference: CharacterLorebookReference,
  ): MaybePromise<ExportedCharacterCardLorebook>
}

export async function toCharacterRevisionContent(
  cardInput: CharacterCardDocumentInput,
  resources?: CharacterCardResourceImporter,
): Promise<CharacterRevisionContent> {
  const card = createCharacterCardDocument(cardInput)
  const importAsset = resources?.importAsset
  const importLorebook = resources?.importLorebook
  if (card.assets.length > 0 && !importAsset) {
    throw new CharacterCardResourceMappingError(
      '角色卡包含资产，导入时必须提供资产映射器',
    )
  }
  if (card.lorebooks.length > 0 && !importLorebook) {
    throw new CharacterCardResourceMappingError(
      '角色卡包含世界书，导入时必须提供世界书映射器',
    )
  }

  const assets = importAsset
    ? await Promise.all(
        card.assets.map(async (asset) => {
          const imported = await importAsset(asset)
          return new CharacterRevisionAsset({
            assetId: imported.assetId,
            kind: asset.kind,
            name: asset.name,
            uri: imported.uri,
            ordinal: asset.ordinal,
            extensions: {
              ...asset.extensions,
              ...imported.extensions,
            },
          })
        }),
      )
    : []
  const lorebooks = importLorebook
    ? await Promise.all(
        card.lorebooks.map(async (lorebook) => {
          const revisionId = await importLorebook(lorebook)
          return new CharacterLorebookReference({
            lorebookRevisionId: revisionId,
            ordinal: lorebook.ordinal,
            enabled: lorebook.enabled,
          })
        }),
      )
    : []

  return {
    name: card.name,
    description: card.description,
    personality: card.personality,
    scenario: card.scenario,
    systemPrompt: card.systemPrompt,
    postHistoryInstructions: card.postHistoryInstructions,
    greetings: [...card.greetings],
    examples: [...card.examples],
    extensions: structuredClone(card.extensions),
    assets,
    lorebooks,
  }
}

export async function fromCharacterRevision(
  revision: CharacterRevision,
  resources?: CharacterCardResourceExporter,
): Promise<CharacterCardDocument> {
  const exportLorebook = resources?.exportLorebook
  if (revision.lorebooks.length > 0 && !exportLorebook) {
    throw new CharacterCardResourceMappingError(
      '角色版本引用了世界书，导出时必须提供资源映射器',
    )
  }

  const assets = await Promise.all(
    revision.assets.map(async (asset) => {
      const exported = await resources?.exportAsset?.(asset)
      return {
        kind: asset.kind,
        name: asset.name,
        ordinal: asset.ordinal,
        uri: exported?.uri ?? asset.uri,
        mediaType: exported?.mediaType,
        data: exported?.data,
        extensions: {
          ...asset.extensions,
          ...exported?.extensions,
        },
      }
    }),
  )
  const lorebooks = exportLorebook
    ? await Promise.all(
        revision.lorebooks.map(async (reference) => {
          const exported = await exportLorebook(reference)
          return {
            ordinal: reference.ordinal,
            enabled: reference.enabled,
            ...exported,
          }
        }),
      )
    : []

  return createCharacterCardDocument({
    name: revision.name,
    description: revision.description,
    personality: revision.personality,
    scenario: revision.scenario,
    systemPrompt: revision.systemPrompt,
    postHistoryInstructions: revision.postHistoryInstructions,
    greetings: revision.greetings,
    examples: revision.examples,
    extensions: revision.extensions,
    assets,
    lorebooks,
  })
}
