import { Inject } from '@nestjs/common'
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs'
import {
	LOREBOOK_LIST_READ_PORT,
	type LorebookListReadPort,
} from '../ports/lorebook-list-read.port'
import {
	GetAvailableLorebookPageResult,
	GetPublicLorebookQuery,
} from './get-available-lorebooks.query'

@QueryHandler(GetPublicLorebookQuery)
export class GetPublicLorebookHandler
	implements IQueryHandler<GetPublicLorebookQuery>
{
	constructor(
		@Inject(LOREBOOK_LIST_READ_PORT)
		private readonly lorebookListRead: LorebookListReadPort,
	) {}

	async execute(
		query: GetPublicLorebookQuery,
	): Promise<GetAvailableLorebookPageResult> {
		const offset = (query.page - 1) * query.pageSize

		const { items, total } = await this.lorebookListRead.findAvailableLorebooks(
			{
				ownerId: query.ownerId,
				offset: offset,
				limit: query.pageSize,
			},
		)

		return {
			items: items,
			pagination: {
				page: query.page,
				pageSize: query.pageSize,
				total: total,
				totalPages: total === 0 ? 0 : Math.ceil(total / query.pageSize),
			},
		}
	}
}
