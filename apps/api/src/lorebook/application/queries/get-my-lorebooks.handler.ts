import { Inject, Injectable } from '@nestjs/common'
import { IQueryHandler } from '@nestjs/cqrs'
import {
	LOREBOOK_LIST_READ_PORT,
	type LorebookListReadPort,
} from '../ports/lorebook-list-read.port'
import {
	GetMyLorebooksQuery,
	type LorebookPageResult,
} from './get-my-lorebooks.query'

@Injectable()
export class GetMyLorebooksHandler
	implements IQueryHandler<GetMyLorebooksQuery>
{
	constructor(
		@Inject(LOREBOOK_LIST_READ_PORT)
		private readonly lorebookListRead: LorebookListReadPort,
	) {}

	async execute(query: GetMyLorebooksQuery): Promise<LorebookPageResult> {
		const offset = (query.page - 1) * query.pageSize

		const { items, total } = await this.lorebookListRead.findMyLorebooks({
			ownerId: query.ownerId,
			offset,
			limit: query.pageSize,
			visibility: query.visibility,
		})

		return {
			items,
			pagination: {
				page: query.page,
				pageSize: query.pageSize,
				total,
				totalPages: total === 0 ? 0 : Math.ceil(total / query.pageSize),
			},
		}
	}
}
