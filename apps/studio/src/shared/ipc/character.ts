import type { CharacterRevisionPatch } from '@kirika-js/core/domain/character'
import type { CharacterRevisionAssetDto } from './asset'
import type { IsoDateTime } from './common'

export interface CharacterLorebookReferenceDto {
  readonly lorebookRevisionId: string
  readonly ordinal: number
  readonly enabled: boolean
}

export interface CharacterRevisionDto {
  readonly id: string
  readonly revisionNumber: number
  readonly isDraft: boolean
  readonly name: string
  readonly description: string
  readonly personality: string
  readonly scenario: string
  readonly systemPrompt: string
  readonly postHistoryInstructions: string
  readonly greetings: readonly string[]
  readonly examples: readonly string[]
  readonly extensions: Readonly<Record<string, unknown>>
  readonly assets: readonly CharacterRevisionAssetDto[]
  readonly lorebooks: readonly CharacterLorebookReferenceDto[]
  readonly createdAt: IsoDateTime
  readonly updatedAt: IsoDateTime
}

export interface CharacterSummaryDto {
  readonly id: string
  readonly alias: string | null
  readonly name: string
  readonly currentRevisionId: string | null
  readonly draftRevisionId: string | null
  readonly revisionCount: number
  readonly hasDraft: boolean
  readonly updatedAt: IsoDateTime
}

export interface CharacterDto {
  readonly id: string
  readonly ownerId: string
  readonly alias: string | null
  readonly currentRevisionId: string | null
  readonly draftRevisionId: string | null
  readonly revisions: readonly CharacterRevisionDto[]
  readonly createdAt: IsoDateTime
  readonly updatedAt: IsoDateTime
}

export interface CharacterRevisionContentInput {
  readonly name: string
  readonly description?: string
  readonly personality?: string
  readonly scenario?: string
  readonly systemPrompt?: string
  readonly postHistoryInstructions?: string
  readonly greetings?: readonly string[]
  readonly examples?: readonly string[]
  readonly extensions?: Readonly<Record<string, unknown>>
}

export interface CreateCharacterInput extends CharacterRevisionContentInput {
  readonly alias?: string | null
}

export interface UpdateCharacterDraftInput {
  readonly characterId: string
  readonly patch: CharacterRevisionPatch
}

export interface SaveCharacterDraftInput extends CharacterIdInput {
  readonly alias: string | null
  readonly content: CharacterRevisionContentInput
  readonly assets: readonly CharacterRevisionAssetDto[]
  readonly lorebooks: readonly CharacterLorebookReferenceDto[]
}

export interface ReplaceCharacterGreetingsInput {
  readonly characterId: string
  readonly greetings: readonly string[]
}

export interface ReplaceCharacterExamplesInput {
  readonly characterId: string
  readonly examples: readonly string[]
}

export interface ImportCharacterAssetInput extends CharacterIdInput {
  readonly kind: CharacterRevisionAssetDto['kind']
}

export interface ReplaceCharacterAssetsInput {
  readonly characterId: string
  readonly assets: readonly CharacterRevisionAssetDto[]
}

export interface ReplaceCharacterLorebooksInput {
  readonly characterId: string
  readonly lorebooks: readonly CharacterLorebookReferenceDto[]
}

export interface CharacterIdInput {
  readonly characterId: string
}

export interface PublishCharacterRevisionInput extends CharacterIdInput {
  readonly revisionId: string
}

export interface ImportCharacterCardInput {
  readonly formatHint?: 'json'
}

export interface ExportCharacterCardInput extends CharacterIdInput {
  readonly revisionId?: string
  readonly format: 'json'
}

export interface ExportCharacterCardResult {
  readonly cancelled: boolean
  readonly filePath: string | null
  readonly format: string
  readonly mediaType: string
}

export const characterChannels = {
  list: 'studio:characters:list',
  create: 'studio:characters:create',
  get: 'studio:characters:get',
  delete: 'studio:characters:delete',
  updateDraft: 'studio:characters:update-draft',
  saveDraft: 'studio:characters:save-draft',
  replaceGreetings: 'studio:characters:replace-greetings',
  replaceExamples: 'studio:characters:replace-examples',
  importAsset: 'studio:characters:import-asset',
  replaceAssets: 'studio:characters:replace-assets',
  replaceLorebooks: 'studio:characters:replace-lorebooks',
  createDraft: 'studio:characters:create-draft',
  publish: 'studio:characters:publish',
  importCard: 'studio:characters:import-card',
  exportCard: 'studio:characters:export-card',
} as const

export interface CharacterApi {
  listCharacters(): Promise<readonly CharacterSummaryDto[]>
  createCharacter(input: CreateCharacterInput): Promise<CharacterDto>
  getCharacter(input: CharacterIdInput): Promise<CharacterDto | null>
  deleteCharacter(input: CharacterIdInput): Promise<void>
  updateCharacterDraft(input: UpdateCharacterDraftInput): Promise<CharacterDto>
  saveCharacterDraft(input: SaveCharacterDraftInput): Promise<CharacterDto>
  replaceCharacterGreetings(
    input: ReplaceCharacterGreetingsInput,
  ): Promise<CharacterDto>
  replaceCharacterExamples(
    input: ReplaceCharacterExamplesInput,
  ): Promise<CharacterDto>
  importCharacterAsset(
    input: ImportCharacterAssetInput,
  ): Promise<CharacterRevisionAssetDto | null>
  replaceCharacterAssets(
    input: ReplaceCharacterAssetsInput,
  ): Promise<CharacterDto>
  replaceCharacterLorebooks(
    input: ReplaceCharacterLorebooksInput,
  ): Promise<CharacterDto>
  createCharacterDraft(input: CharacterIdInput): Promise<CharacterDto>
  publishCharacterRevision(
    input: PublishCharacterRevisionInput,
  ): Promise<CharacterDto>
  importCharacterCard(input: ImportCharacterCardInput): Promise<CharacterDto>
  exportCharacterCard(
    input: ExportCharacterCardInput,
  ): Promise<ExportCharacterCardResult>
}
