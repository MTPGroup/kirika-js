/** biome-ignore-all lint/complexity/noStaticOnlyClass: 实例类允许只有静态方法 */
import {
  Lorebook,
  LorebookEntry,
  LorebookEntryId,
  LorebookId,
  LorebookRevision,
  LorebookRevisionId,
} from '@kirika-js/domain/lorebook'
import { UserId } from '@kirika-js/domain/shared'
import type {
  lorebookEntries,
  lorebookRevisions,
  lorebooks,
} from '~/schema/lorebook.schema'

type LorebookRow = typeof lorebooks.$inferSelect
type RevisionRow = typeof lorebookRevisions.$inferSelect
type EntryRow = typeof lorebookEntries.$inferSelect

export interface LorebookPersistenceAggregate extends LorebookRow {
  revisions: Array<
    RevisionRow & {
      entries: EntryRow[]
    }
  >
}

export class LorebookMapper {
  static toDomain(raw: LorebookPersistenceAggregate): Lorebook {
    const revisions = raw.revisions.map((revision) =>
      LorebookRevision.reconstitute(
        new LorebookRevisionId(revision.id),
        revision.revisionNumber,
        revision.isDraft,
        revision.entries.map((entry) =>
          LorebookEntry.reconstitute(
            new LorebookEntryId(entry.id),
            entry.keys,
            entry.title,
            entry.enabled,
            entry.content,
            entry.position,
            entry.priority,
            {
              secondaryKeys: entry.secondaryKeys,
              matchMode: entry.matchMode,
              constant: entry.constant,
              caseSensitive: entry.caseSensitive,
              matchWholeWords: entry.matchWholeWords,
              probability: entry.probability,
              insertionDepth: entry.insertionDepth,
            },
          ),
        ),
        {
          scanDepth: revision.scanDepth,
          tokenBudget: revision.tokenBudget,
        },
      ),
    )

    return Lorebook.reconstitute(
      new LorebookId(raw.id),
      raw.name,
      raw.description,
      new UserId(raw.ownerId),
      raw.currentRevisionId
        ? new LorebookRevisionId(raw.currentRevisionId)
        : null,
      raw.visibility,
      revisions,
      raw.createdAt,
      raw.updatedAt,
    )
  }

  static toLorebookPersistence(lorebook: Lorebook) {
    return {
      id: lorebook.id.value,
      ownerId: lorebook.ownerId.value,
      name: lorebook.name,
      description: lorebook.description,
      currentRevisionId: lorebook.currentRevision?.id.value ?? null,
      visibility: lorebook.visibility,
      createdAt: lorebook.createdAt,
      updatedAt: lorebook.updatedAt,
    }
  }

  static toRevisionPersistence(lorebook: Lorebook, revision: LorebookRevision) {
    return {
      revision: {
        id: revision.id.value,
        lorebookId: lorebook.id.value,
        revisionNumber: revision.revisionNumber,
        isDraft: revision.isDraft,
        scanDepth: revision.scanDepth,
        tokenBudget: revision.tokenBudget,
      },
      entries: revision.entries.map((entry) => ({
        id: entry.id.value,
        revisionId: revision.id.value,
        keys: [...entry.keys],
        secondaryKeys: [...entry.secondaryKeys],
        matchMode: entry.matchMode,
        constant: entry.constant,
        caseSensitive: entry.caseSensitive,
        matchWholeWords: entry.matchWholeWords,
        probability: entry.probability,
        insertionDepth: entry.insertionDepth,
        title: entry.title,
        enabled: entry.enabled,
        content: entry.content,
        position: entry.position,
        priority: entry.priority,
      })),
    }
  }
}
