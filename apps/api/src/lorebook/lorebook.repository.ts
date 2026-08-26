import type {
  Lorebook,
  LorebookId,
  LorebookRepositoryPort,
} from '@kirika-js/core/domain/lorebook'
import { and, desc, eq, ilike, notInArray, sql } from 'drizzle-orm'
import {
  lorebookEntries,
  lorebookRevisions,
  lorebooks,
} from '../db/lorebook-schema'
import type { Db } from '../lib/db'
import { LorebookMapper } from './mapper'
import { findLorebookByIdQuery } from './query'

export class PgLorebookRepository implements LorebookRepositoryPort {
  constructor(private readonly db: Db) {}

  async findById(id: LorebookId): Promise<Lorebook | null> {
    const raw = await findLorebookByIdQuery(this.db, id.value)
    return raw ? LorebookMapper.toDomain(raw) : null
  }

  async save(lorebook: Lorebook): Promise<void> {
    const lorebookModel = LorebookMapper.toLorebookPersistence(lorebook)

    await this.db.transaction(async (tx) => {
      await tx
        .insert(lorebooks)
        .values(lorebookModel)
        .onConflictDoUpdate({
          target: lorebooks.id,
          set: {
            name: lorebookModel.name,
            description: lorebookModel.description,
            currentRevisionId: lorebookModel.currentRevisionId,
            visibility: lorebookModel.visibility,
            updatedAt: lorebookModel.updatedAt,
          },
        })

      const revisionToSave = lorebook.draftRevision ?? lorebook.currentRevision

      if (!revisionToSave) return

      const model = LorebookMapper.toLorebookRevisionPersistence(
        lorebook.id,
        revisionToSave,
      )
      const activeRevision = model.revision
      const entries = model.entries

      await tx
        .insert(lorebookRevisions)
        .values(activeRevision)
        .onConflictDoUpdate({
          target: lorebookRevisions.id,
          set: {
            isDraft: activeRevision.isDraft,
            scanDepth: activeRevision.scanDepth,
            tokenBudget: activeRevision.tokenBudget,
          },
          setWhere: eq(lorebookRevisions.isDraft, true),
        })

      if (entries.length > 0) {
        await tx
          .insert(lorebookEntries)
          .values(entries)
          .onConflictDoUpdate({
            target: lorebookEntries.id,
            set: {
              title: sql`excluded.title`,
              content: sql`excluded.content`,
              keys: sql`excluded.keys`,
              secondaryKeys: sql`excluded.secondary_keys`,
              enabled: sql`excluded.enabled`,
              position: sql`excluded.position`,
              priority: sql`excluded.priority`,
              matchMode: sql`excluded.match_mode`,
              constant: sql`excluded.constant`,
              caseSensitive: sql`excluded.case_sensitive`,
              matchWholeWords: sql`excluded.match_whole_words`,
              probability: sql`excluded.probability`,
              insertionDepth: sql`excluded.insertion_depth`,
            },
          })

        const currentEntryIds = entries.map((entry) => entry.id)
        await tx
          .delete(lorebookEntries)
          .where(
            and(
              eq(lorebookEntries.revisionId, activeRevision.id),
              notInArray(lorebookEntries.id, currentEntryIds),
            ),
          )
      } else {
        await tx
          .delete(lorebookEntries)
          .where(eq(lorebookEntries.revisionId, activeRevision.id))
      }
    })
  }

  async delete(id: LorebookId): Promise<void> {
    await this.db.delete(lorebooks).where(eq(lorebooks.id, id.value))
  }

  async listByOwner(ownerId: string, limit: number, offset: number) {
    const rows = await this.db
      .select({
        id: lorebooks.id,
        name: lorebooks.name,
        description: lorebooks.description,
        visibility: lorebooks.visibility,
        createdAt: lorebooks.createdAt,
        updatedAt: lorebooks.updatedAt,
      })
      .from(lorebooks)
      .where(eq(lorebooks.ownerId, ownerId))
      .orderBy(desc(lorebooks.updatedAt))
      .limit(limit + 1)
      .offset(offset)

    const hasMore = rows.length > limit
    return { items: rows.slice(0, limit), hasMore }
  }
  async listPublic(limit: number, offset: number, query?: string) {
    const where = query
      ? and(
          eq(lorebooks.visibility, 'public'),
          ilike(lorebooks.name, `%${query}%`),
        )
      : eq(lorebooks.visibility, 'public')

    const rows = await this.db
      .select({
        id: lorebooks.id,
        name: lorebooks.name,
        description: lorebooks.description,
        visibility: lorebooks.visibility,
        createdAt: lorebooks.createdAt,
        updatedAt: lorebooks.updatedAt,
      })
      .from(lorebooks)
      .where(where)
      .orderBy(desc(lorebooks.updatedAt))
      .limit(limit + 1)
      .offset(offset)

    const hasMore = rows.length > limit
    return { items: rows.slice(0, limit), hasMore }
  }
}
