/** biome-ignore-all lint/complexity/noStaticOnlyClass: 实例类允许只有静态方法 */
import { UserId } from '~/auth/user-id.vo'
import {
	Lorebook,
	LorebookId,
} from '~/lorebook/domain/entities/lorebook.entity'
import {
	LorebookEntry,
	LorebookEntryId,
	LoreEntryPosition,
} from '~/lorebook/domain/entities/lorebook-entry.entity'
import {
	LorebookRevision,
	LorebookRevisionId,
} from '~/lorebook/domain/entities/lorebook-revision.entity'
import {
	lorebookEntries,
	lorebookRevisions,
	lorebooks,
} from './lorebook.drizzle-schema'
import { DrizzleLorebookWithRelations } from './lorebook.query'

export type DrizzleLorebookInsert = typeof lorebooks.$inferInsert
export type DrizzleRevisionInsert = typeof lorebookRevisions.$inferInsert
export type DrizzleEntryInsert = typeof lorebookEntries.$inferInsert

export interface LorebookPersistenceModel {
	lorebook: DrizzleLorebookInsert
	activeRevision: {
		revision: DrizzleRevisionInsert
		entries: DrizzleEntryInsert[]
	}
}

export class LorebookMapper {
	static toDomain(raw: DrizzleLorebookWithRelations): Lorebook {
		const revisions =
			raw.revisions?.map((revision) => {
				const entries =
					revision.entries?.map((entry) =>
						LorebookEntry.reconstitute(
							new LorebookEntryId(entry.id),
							entry.keys,
							entry.title,
							entry.enabled,
							entry.content,
							LoreEntryPosition.from(entry.position),
							entry.priority,
						),
					) ?? []

				return LorebookRevision.reconstitute(
					new LorebookRevisionId(revision.id),
					revision.revisionNumber,
					revision.isDraft,
					entries,
				)
			}) ?? []

		return Lorebook.reconstitute(
			new LorebookId(raw.id),
			raw.name,
			raw.description,
			new UserId(raw.ownerId),
			raw.currentRevisionId
				? new LorebookRevisionId(raw.currentRevisionId)
				: null,
			revisions,
			raw.updatedAt,
		)
	}

	static toPersistence(lorebook: Lorebook): LorebookPersistenceModel {
		const activeRevision = lorebook.activeRevision

		return {
			lorebook: {
				id: lorebook.id.value,
				ownerId: lorebook.ownerId.value,
				name: lorebook.name,
				description: lorebook.description,
				currentRevisionId: lorebook.activeRevision?.id.value,
				updatedAt: lorebook.updatedAt,
			},
			activeRevision: {
				revision: {
					id: activeRevision.id.value,
					lorebookId: lorebook.id.value,
					revisionNumber: activeRevision.revisionNumber,
					isDraft: activeRevision.isDraft,
				},
				entries: activeRevision.entries.map((entry) => ({
					id: entry.id.value,
					revisionId: activeRevision.id.value,
					title: entry.title,
					content: entry.content,
					keys: [...entry.keys],
					enabled: entry.enabled,
					position: entry.position.value,
					priority: entry.priority,
				})),
			},
		}
	}
}
