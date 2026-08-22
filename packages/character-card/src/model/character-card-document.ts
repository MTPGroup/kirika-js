import { ASSET_KINDS, type AssetKind } from '@kirika-js/domain/character'
import type { LoreEntryPosition } from '@kirika-js/domain/lorebook'
import { InvalidCharacterCardError } from '../errors'

export const CHARACTER_CARD_MODEL_VERSION = 1 as const

export interface CharacterCardAsset {
  readonly kind: AssetKind
  readonly name: string
  readonly ordinal: number
  readonly uri?: string
  readonly mediaType?: string
  readonly data?: Uint8Array
  readonly extensions: Readonly<Record<string, unknown>>
}

export interface CharacterCardLorebookEntry {
  readonly keys: readonly string[]
  readonly title: string
  readonly enabled: boolean
  readonly content: string
  readonly position: LoreEntryPosition
  readonly priority: number
}

export interface CharacterCardLorebook {
  readonly ordinal: number
  readonly enabled: boolean
  readonly name?: string
  readonly description?: string
  readonly entries: readonly CharacterCardLorebookEntry[]
  readonly extensions: Readonly<Record<string, unknown>>
}

export interface CharacterCardDocument {
  readonly modelVersion: typeof CHARACTER_CARD_MODEL_VERSION
  readonly name: string
  readonly description: string
  readonly personality: string
  readonly scenario: string
  readonly systemPrompt: string
  readonly postHistoryInstructions: string
  readonly greetings: readonly string[]
  readonly examples: readonly string[]
  readonly extensions: Readonly<Record<string, unknown>>
  readonly assets: readonly CharacterCardAsset[]
  readonly lorebooks: readonly CharacterCardLorebook[]
}

export interface CharacterCardDocumentInput {
  readonly modelVersion?: typeof CHARACTER_CARD_MODEL_VERSION
  readonly name: string
  readonly description?: string
  readonly personality?: string
  readonly scenario?: string
  readonly systemPrompt?: string
  readonly postHistoryInstructions?: string
  readonly greetings?: readonly string[]
  readonly examples?: readonly string[]
  readonly extensions?: Readonly<Record<string, unknown>>
  readonly assets?: readonly CharacterCardAssetInput[]
  readonly lorebooks?: readonly CharacterCardLorebookInput[]
}

export interface CharacterCardAssetInput {
  readonly kind: AssetKind
  readonly name: string
  readonly ordinal: number
  readonly uri?: string
  readonly mediaType?: string
  readonly data?: Uint8Array
  readonly extensions?: Readonly<Record<string, unknown>>
}

export interface CharacterCardLorebookEntryInput {
  readonly keys: readonly string[]
  readonly title: string
  readonly enabled?: boolean
  readonly content: string
  readonly position: LoreEntryPosition
  readonly priority?: number
}

export interface CharacterCardLorebookInput {
  readonly ordinal: number
  readonly enabled?: boolean
  readonly name?: string
  readonly description?: string
  readonly entries: readonly CharacterCardLorebookEntryInput[]
  readonly extensions?: Readonly<Record<string, unknown>>
}

export function createCharacterCardDocument(
  input: CharacterCardDocumentInput,
): CharacterCardDocument {
  if (input.modelVersion !== undefined && input.modelVersion !== 1) {
    throw new InvalidCharacterCardError(
      `不支持的角色卡内部模型版本: ${input.modelVersion}`,
    )
  }

  const name = input.name.trim()
  if (!name) throw new InvalidCharacterCardError('角色名称不能为空')

  const assets = (input.assets ?? []).map(normalizeAsset)
  assertUniqueOrdinals(
    assets,
    (asset) => `${asset.kind}:${asset.ordinal}`,
    '角色卡资产位置重复',
  )

  const lorebooks = (input.lorebooks ?? []).map(normalizeLorebook)
  assertUniqueOrdinals(
    lorebooks,
    (lorebook) => lorebook.ordinal.toString(),
    '角色卡世界书位置重复',
  )

  return {
    modelVersion: CHARACTER_CARD_MODEL_VERSION,
    name,
    description: input.description ?? '',
    personality: input.personality ?? '',
    scenario: input.scenario ?? '',
    systemPrompt: input.systemPrompt ?? '',
    postHistoryInstructions: input.postHistoryInstructions ?? '',
    greetings: normalizeTextList(input.greetings ?? []),
    examples: normalizeTextList(input.examples ?? []),
    extensions: cloneExtensions(input.extensions),
    assets,
    lorebooks,
  }
}

function normalizeAsset(input: CharacterCardAssetInput): CharacterCardAsset {
  if (!ASSET_KINDS.includes(input.kind)) {
    throw new InvalidCharacterCardError(`不支持的角色资产类型: ${input.kind}`)
  }
  const name = input.name.trim()
  if (!name) throw new InvalidCharacterCardError('角色卡资产名称不能为空')
  assertOrdinal(input.ordinal, '角色卡资产序号')

  const uri = input.uri?.trim() || undefined
  const mediaType = input.mediaType?.trim() || undefined
  const data = input.data?.byteLength ? new Uint8Array(input.data) : undefined
  if (!uri && !data) {
    throw new InvalidCharacterCardError('角色卡资产必须包含 URI 或二进制数据')
  }

  return {
    kind: input.kind,
    name,
    ordinal: input.ordinal,
    uri,
    mediaType,
    data,
    extensions: cloneExtensions(input.extensions),
  }
}

function normalizeLorebook(
  input: CharacterCardLorebookInput,
): CharacterCardLorebook {
  assertOrdinal(input.ordinal, '角色卡世界书序号')

  return {
    ordinal: input.ordinal,
    enabled: input.enabled ?? true,
    name: input.name?.trim() || undefined,
    description: input.description,
    entries: input.entries.map(normalizeLorebookEntry),
    extensions: cloneExtensions(input.extensions),
  }
}

function normalizeLorebookEntry(
  input: CharacterCardLorebookEntryInput,
): CharacterCardLorebookEntry {
  const keys = normalizeTextList(input.keys.map((key) => key.trim()))
  if (keys.length === 0) {
    throw new InvalidCharacterCardError('角色卡世界书条目至少需要一个关键词')
  }

  const title = input.title.trim()
  if (!title) {
    throw new InvalidCharacterCardError('角色卡世界书条目标题不能为空')
  }
  if (!input.content.trim()) {
    throw new InvalidCharacterCardError('角色卡世界书条目内容不能为空')
  }
  if (
    input.position !== 'before_history' &&
    input.position !== 'after_history'
  ) {
    throw new InvalidCharacterCardError(
      `不支持的世界书条目位置: ${input.position}`,
    )
  }
  const priority = input.priority ?? 0
  if (!Number.isFinite(priority)) {
    throw new InvalidCharacterCardError('世界书条目优先级必须是有限数值')
  }

  return {
    keys,
    title,
    enabled: input.enabled ?? true,
    content: input.content,
    position: input.position,
    priority,
  }
}

function normalizeTextList(values: readonly string[]): string[] {
  return [...new Set(values.filter((value) => value.trim().length > 0))]
}

function cloneExtensions(
  extensions: Readonly<Record<string, unknown>> | undefined,
): Readonly<Record<string, unknown>> {
  try {
    return structuredClone(extensions ?? {})
  } catch (error) {
    throw new InvalidCharacterCardError('角色卡扩展字段必须可序列化', {
      cause: error,
    })
  }
}

function assertOrdinal(value: number, label: string): void {
  if (!Number.isInteger(value) || value < 0) {
    throw new InvalidCharacterCardError(`${label}必须是非负整数`)
  }
}

function assertUniqueOrdinals<T>(
  values: readonly T[],
  toKey: (value: T) => string,
  message: string,
): void {
  const keys = new Set<string>()
  for (const value of values) {
    const key = toKey(value)
    if (keys.has(key)) {
      throw new InvalidCharacterCardError(`${message}: ${key}`)
    }
    keys.add(key)
  }
}
