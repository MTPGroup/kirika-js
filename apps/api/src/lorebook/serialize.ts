import type { Lorebook } from '@kirika-js/core/domain/lorebook'

export function lorebookToJson(lorebook: Lorebook) {
  return {
    id: lorebook.id.value,
    ownerId: lorebook.ownerId.value,
    name: lorebook.name,
    description: lorebook.description,
    visibility: lorebook.visibility,
    currentRevisionId: lorebook.currentRevision?.id.value ?? null,
    revisions: lorebook.revisions.map((revision) => ({
      id: revision.id.value,
      revisionNumber: revision.revisionNumber,
      isDraft: revision.isDraft,
      scanDepth: revision.scanDepth,
      tokenBudget: revision.tokenBudget,
      entries: revision.entries.map((entry) => ({
        id: entry.id.value,
        keys: entry.keys,
        secondaryKeys: entry.secondaryKeys,
        title: entry.title,
        enabled: entry.enabled,
        content: entry.content,
        position: entry.position,
        priority: entry.priority,
        matchMode: entry.matchMode,
        constant: entry.constant,
        caseSensitive: entry.caseSensitive,
        matchWholeWords: entry.matchWholeWords,
        probability: entry.probability,
        insertionDepth: entry.insertionDepth,
      })),
    })),
    createdAt: lorebook.createdAt,
    updatedAt: lorebook.updatedAt,
  }
}
