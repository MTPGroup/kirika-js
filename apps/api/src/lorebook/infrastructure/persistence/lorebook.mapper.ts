/** biome-ignore-all lint/complexity/noStaticOnlyClass: 实例类允许只有静态方法 */

import {
	Lorebook,
	LorebookEntry,
	LorebookEntryId,
	LorebookId,
	LorebookRevision,
	LorebookRevisionId,
} from '@kirika-js/domain/lorebook'
import { UserId } from '~/auth/user-id.vo'
import {
	lorebookEntries,
	lorebookRevisions,
	lorebooks,
} from './lorebook.drizzle-schema'
import { DrizzleLorebookWithRelations } from './lorebook.query'

export type DrizzleLorebookInsert = typeof lorebooks.$inferInsert
export type DrizzleRevisionInsert = typeof lorebookRevisions.$inferInsert
export type DrizzleEntryInsert = typeof lorebookEntries.$inferInsert

export interface LorebookRevisionPersistenceModel {
	revision: DrizzleRevisionInsert
	entries: DrizzleEntryInsert[]
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
							entry.position,
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
			currentRevisionId: lorebook.currentRevision?.id.value,
			visibility: lorebook.visibility,
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
			},
			entries: revision.entries.map((entry) => ({
				id: entry.id.value,
				revisionId: revision.id.value,
				title: entry.title,
				content: entry.content,
				keys: [...entry.keys],
				enabled: entry.enabled,
				position: entry.position,
				priority: entry.priority,
			})),
		}
	}
}
