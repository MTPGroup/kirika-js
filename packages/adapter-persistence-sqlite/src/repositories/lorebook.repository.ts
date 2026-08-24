import {
  type Lorebook,
  LorebookId,
  type LorebookRepositoryPort,
} from '@kirika-js/domain/lorebook'
import { and, eq, inArray, notInArray, sql } from 'drizzle-orm'
import type { SqliteDatabase } from '~/database'
import { LorebookMapper } from '~/mappers/lorebook.mapper'
import {
  lorebookEntries,
  lorebookRevisions,
  lorebooks,
} from '~/schema/lorebook.schema'

export class SqliteLorebookRepository implements LorebookRepositoryPort {
  constructor(private readonly db: SqliteDatabase) {}

  async findById(id: LorebookId): Promise<Lorebook | null> {
    const [lorebook] = await this.db
      .select()
      .from(lorebooks)
      .where(eq(lorebooks.id, id.value))
      .limit(1)

    if (!lorebook) return null

    const revisions = await this.db
      .select()
      .from(lorebookRevisions)
      .where(eq(lorebookRevisions.lorebookId, id.value))
      .orderBy(lorebookRevisions.revisionNumber)

    const revisionIds = revisions.map((revision) => revision.id)

    const entries =
      revisionIds.length === 0
        ? []
        : await this.db
            .select()
            .from(lorebookEntries)
            .where(inArray(lorebookEntries.revisionId, revisionIds))

    return LorebookMapper.toDomain({
      ...lorebook,

      revisions: revisions.map((revision) => ({
        ...revision,

        entries: entries
          .filter((entry) => entry.revisionId === revision.id)
          .sort((a, b) => b.priority - a.priority),
      })),
    })
  }

  async findAll(): Promise<Lorebook[]> {
    const rows = await this.db.select({ id: lorebooks.id }).from(lorebooks)
    const results = await Promise.all(
      rows.map((row) => this.findById(new LorebookId(row.id))),
    )
    return results.filter((value): value is Lorebook => value !== null)
  }

  async save(lorebook: Lorebook): Promise<void> {
    const lorebookModel = LorebookMapper.toLorebookPersistence(lorebook)

    const revisionToSave = lorebook.draftRevision ?? lorebook.currentRevision

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

      if (!revisionToSave) return

      const model = LorebookMapper.toRevisionPersistence(
        lorebook,
        revisionToSave,
      )

      await tx
        .insert(lorebookRevisions)
        .values(model.revision)
        .onConflictDoUpdate({
          target: lorebookRevisions.id,

          set: {
            isDraft: model.revision.isDraft,
          },

          setWhere: eq(lorebookRevisions.isDraft, true),
        })

      if (!revisionToSave.isDraft) return

      if (model.entries.length === 0) {
        await tx
          .delete(lorebookEntries)
          .where(eq(lorebookEntries.revisionId, revisionToSave.id.value))

        return
      }

      await tx
        .insert(lorebookEntries)
        .values(model.entries)
        .onConflictDoUpdate({
          target: lorebookEntries.id,

          set: {
            keys: sql`excluded.keys`,
            title: sql`excluded.title`,
            enabled: sql`excluded.enabled`,
            content: sql`excluded.content`,
            position: sql`excluded.position`,
            priority: sql`excluded.priority`,
          },
        })

      const entryIds = model.entries.map((entry) => entry.id)

      await tx
        .delete(lorebookEntries)
        .where(
          and(
            eq(lorebookEntries.revisionId, revisionToSave.id.value),
            notInArray(lorebookEntries.id, entryIds),
          ),
        )
    })
  }

  async delete(id: LorebookId): Promise<void> {
    await this.db.delete(lorebooks).where(eq(lorebooks.id, id.value))
  }
}
