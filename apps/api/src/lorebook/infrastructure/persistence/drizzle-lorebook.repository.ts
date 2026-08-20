import { Injectable } from '@nestjs/common'
import { eq, notInArray, sql } from 'drizzle-orm'
import {
	Lorebook,
	LorebookId,
} from '~/lorebook/domain/entities/lorebook.entity'
import { LorebookRepositoryPort } from '~/lorebook/domain/ports/lorebook-repository.port'
import { DrizzleService } from '~/shared/infrastructure/drizzle/drizzle.service'
import {
	lorebookEntries,
	lorebookRevisions,
	lorebooks,
} from './lorebook.drizzle-schema'
import { LorebookMapper } from './lorebook.mapper'
import { findLorebookByIdQuery } from './lorebook.query'

@Injectable()
export class DrizzleLorebookRepository implements LorebookRepositoryPort {
	constructor(private readonly drizzleService: DrizzleService) {}

	async findById(id: LorebookId): Promise<Lorebook | null> {
		const db = this.drizzleService.db

		const raw = await findLorebookByIdQuery(db, id.value)
		if (!raw) return null

		return LorebookMapper.toDomain(raw)
	}

	async save(lorebook: Lorebook): Promise<void> {
		const lorebookModel = LorebookMapper.toLorebookPersistence(lorebook)

		await this.drizzleService.db.transaction(async (tx) => {
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
						extensions: lorebookModel.extensions,
					},
				})

			if (lorebook.activeRevision) {
				const model = LorebookMapper.toLorebookRevisionPersistence(
					lorebook.id,
					lorebook.activeRevision,
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
								enabled: sql`excluded.enabled`,
								position: sql`excluded.position`,
								priority: sql`excluded.priority`,
							},
						})

					const currentEntryIds = entries.map((e) => e.id)
					await tx
						.delete(lorebookEntries)
						.where(
							eq(lorebookEntries.revisionId, activeRevision.id) &&
								notInArray(lorebookEntries.id, currentEntryIds),
						)
				} else {
					await tx
						.delete(lorebookEntries)
						.where(eq(lorebookEntries.revisionId, activeRevision.id))
				}
			}
		})
	}

	async delete(id: LorebookId): Promise<void> {
		await this.drizzleService.db
			.delete(lorebooks)
			.where(eq(lorebooks.id, id.value))
	}
}
