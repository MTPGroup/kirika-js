import { Injectable } from '@nestjs/common'
import { eq, sql } from 'drizzle-orm'
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
		const model = LorebookMapper.toPersistence(lorebook)

		await this.drizzleService.db.transaction(async (tx) => {
			await tx
				.insert(lorebooks)
				.values(model.lorebook)
				.onConflictDoUpdate({
					target: lorebooks.id,
					set: {
						name: model.lorebook.name,
						description: model.lorebook.description,
						currentRevisionId: model.lorebook.currentRevisionId,
					},
				})
			for (const { revision, entries } of model.revisions) {
				await tx
					.insert(lorebookRevisions)
					.values(revision)
					.onConflictDoUpdate({
						target: lorebookRevisions.id,
						set: {
							isDraft: revision.isDraft,
						},
					})

				if (entries.length > 0) {
					await tx
						.insert(lorebookEntries)
						.values(entries)
						.onConflictDoUpdate({
							target: lorebookEntries.id,
							set: {
								keys: sql`excluded.keys`,
								title: sql`excluded.title`,
								content: sql`excluded.content`,
								position: sql`excluded.position`,
								priority: sql`excluded.priority`,
								enabled: sql`excluded.enabled`,
							},
						})
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
