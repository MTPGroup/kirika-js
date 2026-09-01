import type {
  LorebookVisibility,
  LoreEntryMatchMode,
  LoreEntryPosition,
} from '@kirika-js/core/domain/lorebook'
import type { IsoDateTime } from './common'

export interface LorebookEntryDto {
  readonly id: string
  readonly keys: readonly string[]
  readonly secondaryKeys: readonly string[]
  readonly title: string
  readonly enabled: boolean
  readonly constant: boolean
  readonly content: string
  readonly position: LoreEntryPosition
  readonly insertionDepth: number
  readonly priority: number
  readonly matchMode: LoreEntryMatchMode
  readonly caseSensitive: boolean
  readonly matchWholeWords: boolean
  readonly probability: number
}

export interface LorebookRevisionDto {
  readonly id: string
  readonly revisionNumber: number
  readonly isDraft: boolean
  readonly scanDepth: number
  readonly tokenBudget: number
  readonly entries: readonly LorebookEntryDto[]
}

export interface LorebookSummaryDto {
  readonly id: string
  readonly name: string
  readonly description: string
  readonly visibility: LorebookVisibility
  readonly currentRevisionId: string | null
  readonly draftRevisionId: string | null
  readonly revisionCount: number
  readonly entryCount: number
  readonly updatedAt: IsoDateTime
}

export interface LorebookDto {
  readonly id: string
  readonly ownerId: string
  readonly name: string
  readonly description: string
  readonly visibility: LorebookVisibility
  readonly currentRevisionId: string | null
  readonly draftRevisionId: string | null
  readonly revisions: readonly LorebookRevisionDto[]
  readonly createdAt: IsoDateTime
  readonly updatedAt: IsoDateTime
}

export interface LorebookIdInput {
  readonly lorebookId: string
}

export interface CreateLorebookInput {
  readonly name: string
  readonly description?: string
}

export interface UpdateLorebookMetadataInput extends LorebookIdInput {
  readonly name: string
  readonly description: string
}

export interface ChangeLorebookVisibilityInput extends LorebookIdInput {
  readonly visibility: LorebookVisibility
}

export interface LorebookEntryInput {
  readonly id?: string
  readonly keys: readonly string[]
  readonly secondaryKeys?: readonly string[]
  readonly title: string
  readonly enabled?: boolean
  readonly constant?: boolean
  readonly content: string
  readonly position: LoreEntryPosition
  readonly insertionDepth?: number
  readonly priority?: number
  readonly matchMode?: LoreEntryMatchMode
  readonly caseSensitive?: boolean
  readonly matchWholeWords?: boolean
  readonly probability?: number
}

export interface ReplaceLorebookEntriesInput extends LorebookIdInput {
  readonly name: string
  readonly description: string
  readonly visibility: LorebookVisibility
  readonly scanDepth: number
  readonly tokenBudget: number
  readonly entries: readonly LorebookEntryInput[]
}

export interface PublishLorebookRevisionInput extends LorebookIdInput {
  readonly revisionId: string
}

export const lorebookChannels = {
  list: 'studio:lorebooks:list',
  create: 'studio:lorebooks:create',
  get: 'studio:lorebooks:get',
  delete: 'studio:lorebooks:delete',
  updateMetadata: 'studio:lorebooks:update-metadata',
  changeVisibility: 'studio:lorebooks:change-visibility',
  createDraft: 'studio:lorebooks:create-draft',
  replaceEntries: 'studio:lorebooks:replace-entries',
  publish: 'studio:lorebooks:publish',
} as const

export interface LorebookApi {
  listLorebooks(): Promise<readonly LorebookSummaryDto[]>
  createLorebook(input: CreateLorebookInput): Promise<LorebookDto>
  getLorebook(input: LorebookIdInput): Promise<LorebookDto | null>
  deleteLorebook(input: LorebookIdInput): Promise<void>
  updateLorebookMetadata(input: UpdateLorebookMetadataInput): Promise<LorebookDto>
  changeLorebookVisibility(input: ChangeLorebookVisibilityInput): Promise<LorebookDto>
  createLorebookDraft(input: LorebookIdInput): Promise<LorebookDto>
  replaceLorebookEntries(input: ReplaceLorebookEntriesInput): Promise<LorebookDto>
  publishLorebookRevision(input: PublishLorebookRevisionInput): Promise<LorebookDto>
}
