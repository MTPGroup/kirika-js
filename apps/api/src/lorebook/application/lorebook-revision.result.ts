import type {
  Lorebook,
  LorebookRevision,
  LoreEntryPosition,
} from '@kirika-js/core/domain/lorebook'

export interface LorebookRevisionEntryResult {
  id: string
  keys: string[]
  title: string
  enabled: boolean
  content: string
  position: LoreEntryPosition
  priority: number
}

export interface LorebookRevisionResult {
  lorebookId: string
  id: string
  revisionNumber: number
  isDraft: boolean
  entries: LorebookRevisionEntryResult[]
  currentRevisionId: string | null
  updatedAt: Date
}

export function toLorebookRevisionResult(
  lorebook: Lorebook,
  revision: LorebookRevision,
): LorebookRevisionResult {
  return {
    lorebookId: lorebook.id.value,
    id: revision.id.value,
    revisionNumber: revision.revisionNumber,
    isDraft: revision.isDraft,
    entries: revision.entries.map((entry) => ({
      id: entry.id.value,
      keys: [...entry.keys],
      title: entry.title,
      enabled: entry.enabled,
      content: entry.content,
      position: entry.position,
      priority: entry.priority,
    })),
    currentRevisionId: lorebook.currentRevision?.id.value ?? null,
    updatedAt: lorebook.updatedAt,
  }
}
