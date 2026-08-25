/** biome-ignore-all lint/complexity/noStaticOnlyClass: 实例类允许只有静态方法 */
import {
  Lorebook,
  LorebookEntry,
  LorebookEntryId,
  LorebookId,
  LorebookRevision,
  LorebookRevisionId,
} from '@kirika-js/core/domain/lorebook'
import { UserId } from '@kirika-js/core/domain/shared'
import type {
  lorebookEntries,
  lorebookRevisions,
  lorebooks,
} from '../db/lorebook-schema'
import type { DrizzleLorebookWithRelations } from './query'

export type DrizzleLorebookInsert = typeof lorebooks.$inferInsert
export type DrizzleRevisionInsert = typeof lorebookRevisions.$inferInsert
export type DrizzleEntryInsert = typeof lorebookEntries.$inferInsert

export interface LorebookRevisionPersistenceModel {
  revision: DrizzleRevisionInsert
  entries: DrizzleEntryInsert[]
}

export class LorebookMapper {
  static toDomain(raw: DrizzleLorebookWithRelations): Lorebook {
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
        { scanDepth: revision.scanDepth, tokenBudget: revision.tokenBudget },
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

  static toLorebookPersistence(lorebook: Lorebook): DrizzleLorebookInsert {
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

  static toLorebookRevisionPersistence(
    lorebookId: LorebookId,
    revision: LorebookRevision,
  ): LorebookRevisionPersistenceModel {
    return {
      revision: {
        id: revision.id.value,
        lorebookId: lorebookId.value,
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
    }
  }
}
