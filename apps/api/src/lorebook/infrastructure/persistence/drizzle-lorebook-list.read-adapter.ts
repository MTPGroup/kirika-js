import { Injectable } from '@nestjs/common'
import { and, count, desc, eq } from 'drizzle-orm'
import {
	FindAvailableLorebooksInput,
	FindMyLorebooksInput,
	LorebookListItem,
	LorebookListReadPort,
} from '~/lorebook/application/ports/lorebook-list-read.port'
import { DrizzleService } from '~/shared/infrastructure/drizzle/drizzle.service'
import { lorebooks } from './lorebook.drizzle-schema'

@Injectable()
export class DrizzleLorebookListReadAdapter implements LorebookListReadPort {
	constructor(private readonly service: DrizzleService) {}

	async findMyLorebooks(
		input: FindMyLorebooksInput,
	): Promise<{ items: LorebookListItem[]; total: number }> {
		const db = this.service.db

		const where = and(
			eq(lorebooks.ownerId, input.ownerId),
			input.visibility ? eq(lorebooks.visibility, input.visibility) : undefined,
		)

		const [items, totalRows] = await Promise.all([
			db
				.select({
					id: lorebooks.id,
					ownerId: lorebooks.ownerId,
					name: lorebooks.name,
					description: lorebooks.description,
					visibility: lorebooks.visibility,
					currentRevisionId: lorebooks.currentRevisionId,
					createdAt: lorebooks.createdAt,
					updatedAt: lorebooks.updatedAt,
				})
				.from(lorebooks)
				.where(where)
				.orderBy(desc(lorebooks.updatedAt), desc(lorebooks.id))
				.limit(input.limit)
				.offset(input.offset),

			db
				.select({
					total: count(),
				})
				.from(lorebooks)
				.where(where),
		])

		return {
			items,
			total: totalRows[0]?.total ?? 0,
		}
	}

	async findAvailableLorebooks(
		input: FindAvailableLorebooksInput,
	): Promise<{ items: LorebookListItem[]; total: number }> {
		const db = this.service.db

		const where = and(
			eq(lorebooks.visibility, 'public'),
			input.ownerId ? eq(lorebooks.ownerId, input.ownerId) : undefined,
		)

		const [items, totalRows] = await Promise.all([
			db
				.select({
					id: lorebooks.id,
					ownerId: lorebooks.ownerId,
					name: lorebooks.name,
					description: lorebooks.description,
					visibility: lorebooks.visibility,
					currentRevisionId: lorebooks.currentRevisionId,
					createdAt: lorebooks.createdAt,
					updatedAt: lorebooks.updatedAt,
				})
				.from(lorebooks)
				.where(where)
				.orderBy(desc(lorebooks.updatedAt), desc(lorebooks.id))
				.limit(input.limit)
				.offset(input.offset),

			db
				.select({
					total: count(),
				})
				.from(lorebooks)
				.where(where),
		])

		return {
			items: items,
			total: totalRows[0].total ?? 0,
		}
	}
}
