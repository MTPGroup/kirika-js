import {
  type ExportAsset,
  type ExportFormat,
  exportCardAsync,
} from '@character-foundry/character-foundry/exporter'
import {
  type CCv3Data,
  type ContainerFormat,
  type ExtractedAsset,
  parseCardAsync,
} from '@character-foundry/character-foundry/loader'
import {
  type CharacterCardCodec,
  type CharacterCardCodecOutput,
  CharacterCardCodecRegistry,
  type CharacterCardDocument,
  type CharacterCardDocumentInput,
  type CharacterCardSource,
} from '@kirika-js/core/character-card'
import type { AssetKind } from '@kirika-js/core/domain/character'
import type { LoreEntryPosition } from '@kirika-js/core/domain/lorebook'

export type CharacterFoundryFormat = ExportFormat | 'json'

export class CharacterFoundryCardCodec implements CharacterCardCodec {
  constructor(readonly format: CharacterFoundryFormat) {}

  async canDecode(source: CharacterCardSource): Promise<boolean> {
    try {
      const result = await parseCardAsync(source.data, { extractAssets: false })
      return matchesContainer(result.containerFormat, this.format)
    } catch {
      return false
    }
  }

  async decode(
    source: CharacterCardSource,
  ): Promise<CharacterCardDocumentInput> {
    const result = await parseCardAsync(source.data)
    return toCharacterCardDocumentInput(result.card, result.assets)
  }

  async encode(card: CharacterCardDocument): Promise<CharacterCardCodecOutput> {
    const converted = toCCv3Data(card)

    if (this.format === 'json') {
      return {
        data: new TextEncoder().encode(JSON.stringify(converted.card, null, 2)),
        mediaType: 'application/json',
        fileExtension: 'json',
      }
    }

    if (
      this.format === 'png' &&
      !converted.assets.some((asset) => asset.type === 'icon')
    ) {
      throw new Error('PNG 角色卡导出至少需要一个带二进制数据的 avatar 资产')
    }

    const result = await exportCardAsync(converted.card, converted.assets, {
      format: this.format,
    })
    return {
      data: result.buffer,
      mediaType: result.mimeType,
      fileExtension: extensionFor(this.format),
    }
  }
}

export function createCharacterFoundryCardCodecs(): CharacterCardCodec[] {
  return [
    new CharacterFoundryCardCodec('json'),
    new CharacterFoundryCardCodec('png'),
    new CharacterFoundryCardCodec('charx'),
    new CharacterFoundryCardCodec('voxta'),
  ]
}

export const characterFoundryCardRegistry = new CharacterCardCodecRegistry(
  createCharacterFoundryCardCodecs(),
)

function matchesContainer(
  container: ContainerFormat,
  format: CharacterFoundryFormat,
): boolean {
  return container === format
}

function toCharacterCardDocumentInput(
  card: CCv3Data,
  extractedAssets: readonly ExtractedAsset[],
): CharacterCardDocumentInput {
  const data = card.data
  const book = data.character_book

  return {
    modelVersion: 2,
    name: data.name,
    description: data.description,
    personality: data.personality ?? '',
    scenario: data.scenario,
    systemPrompt: data.system_prompt ?? '',
    postHistoryInstructions: data.post_history_instructions ?? '',
    greetings: [data.first_mes, ...(data.alternate_greetings ?? [])].filter(
      Boolean,
    ),
    examples: data.mes_example ? [data.mes_example] : [],
    extensions: data.extensions ?? {},
    assets: (data.assets ?? []).map((asset, ordinal) => {
      const extracted = extractedAssets.find(
        (candidate) => candidate.name === asset.name,
      )
      return {
        kind: foundryAssetToCore(asset.type),
        name: asset.name,
        ordinal,
        uri: asset.uri,
        mediaType: mediaTypeFor(asset.ext),
        data: extracted?.data,
      }
    }),
    lorebooks: book
      ? [
          {
            ordinal: 0,
            enabled: true,
            name: book.name,
            description: book.description,
            entries: book.entries.map((entry, index) => {
              const position = toCorePosition(entry.position)
              return {
                keys: entry.keys ?? [],
                secondaryKeys: entry.secondary_keys ?? [],
                title: entry.name ?? entry.comment ?? `Entry ${index + 1}`,
                enabled: entry.enabled,
                constant: entry.constant ?? false,
                content: entry.content,
                position,
                insertionDepth:
                  position === 'at_depth'
                    ? Math.max(
                        0,
                        typeof entry.position === 'number'
                          ? entry.position
                          : (entry.depth ?? 0),
                      )
                    : 0,
                priority: entry.priority ?? entry.insertion_order,
                matchMode: entry.selective_logic === 'AND' ? 'all' : 'any',
                caseSensitive: entry.case_sensitive ?? false,
                matchWholeWords: false,
                probability: entry.probability ?? 100,
              }
            }),
            extensions: book.extensions,
          },
        ]
      : [],
  }
}

function toCCv3Data(card: CharacterCardDocument): {
  card: CCv3Data
  assets: ExportAsset[]
} {
  if (card.lorebooks.length > 1) {
    throw new Error('Character Foundry 导出目前最多支持一个嵌入世界书')
  }

  const book = card.lorebooks[0]
  const assets = card.assets
    .filter(
      (asset): asset is typeof asset & { data: Uint8Array } => !!asset.data,
    )
    .map((asset) => ({
      name: asset.name,
      type: coreAssetToFoundry(asset.kind),
      ext: extensionForAsset(asset.mediaType, asset.uri),
      data: asset.data,
      isMain: asset.kind === 'avatar',
    }))

  return {
    card: {
      spec: 'chara_card_v3',
      spec_version: '3.0',
      data: {
        name: card.name,
        description: card.description,
        personality: card.personality,
        scenario: card.scenario,
        first_mes: card.greetings[0] ?? '',
        mes_example: card.examples.join('\n'),
        creator: '',
        character_version: '',
        tags: [],
        group_only_greetings: [],
        system_prompt: card.systemPrompt,
        post_history_instructions: card.postHistoryInstructions,
        alternate_greetings: card.greetings.slice(1),
        extensions: card.extensions,
        assets: card.assets.map((asset) => ({
          type: coreAssetToFoundry(asset.kind),
          uri: asset.uri ?? `embed://${asset.name}`,
          name: asset.name,
          ext: extensionForAsset(asset.mediaType, asset.uri),
        })),
        character_book: book
          ? {
              name: book.name,
              description: book.description,
              extensions: book.extensions,
              entries: book.entries.map((entry, index) => ({
                keys: [...entry.keys],
                content: entry.content,
                enabled: entry.enabled,
                insertion_order: entry.priority || index,
                case_sensitive: entry.caseSensitive,
                name: entry.title,
                priority: entry.priority,
                selective: entry.matchMode !== 'any',
                secondary_keys: [...entry.secondaryKeys],
                constant: entry.constant,
                position: fromCorePosition(
                  entry.position,
                  entry.insertionDepth,
                ),
                probability: entry.probability,
                depth: entry.insertionDepth,
                selective_logic: entry.matchMode === 'all' ? 'AND' : undefined,
              })),
            }
          : undefined,
      },
    },
    assets,
  }
}

function foundryAssetToCore(type: string): AssetKind {
  switch (type) {
    case 'icon':
    case 'user_icon':
      return 'avatar'
    case 'background':
      return 'background'
    case 'emotion':
      return 'emotion'
    case 'sound':
      return 'audio'
    case 'video':
      return 'video'
    default:
      return 'other'
  }
}

type FoundryCardAssetType =
  | 'icon'
  | 'emotion'
  | 'background'
  | 'sound'
  | 'custom'

function coreAssetToFoundry(kind: AssetKind): FoundryCardAssetType {
  switch (kind) {
    case 'avatar':
      return 'icon'
    case 'background':
      return 'background'
    case 'emotion':
      return 'emotion'
    case 'audio':
      return 'sound'
    default:
      return 'custom'
  }
}

function toCorePosition(position: unknown): LoreEntryPosition {
  if (position === 'before_char') return 'before_history'
  if (typeof position === 'number') return 'at_depth'
  return 'after_history'
}

function fromCorePosition(
  position: LoreEntryPosition,
  depth: number,
): 'before_char' | 'after_char' | number {
  if (position === 'before_history') return 'before_char'
  if (position === 'at_depth') return depth
  return 'after_char'
}

function extensionFor(format: ExportFormat): string {
  switch (format) {
    case 'png':
      return 'png'
    case 'charx':
      return 'charx'
    case 'voxta':
      return 'voxpkg'
  }
}

function extensionForAsset(
  mediaType: string | undefined,
  uri: string | undefined,
): string {
  const byMediaType: Record<string, string> = {
    'image/png': 'png',
    'image/jpeg': 'jpg',
    'image/webp': 'webp',
    'audio/mpeg': 'mp3',
    'audio/ogg': 'ogg',
    'video/mp4': 'mp4',
  }
  if (mediaType && byMediaType[mediaType]) return byMediaType[mediaType]

  const path = uri?.split('?')[0]
  const suffix = path?.match(/\.([a-z0-9]+)$/i)?.[1]
  return suffix?.toLowerCase() ?? 'bin'
}

function mediaTypeFor(extension: string): string | undefined {
  const byExtension: Record<string, string> = {
    png: 'image/png',
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    webp: 'image/webp',
    gif: 'image/gif',
    mp3: 'audio/mpeg',
    ogg: 'audio/ogg',
    mp4: 'video/mp4',
  }
  return byExtension[extension.toLowerCase()]
}
