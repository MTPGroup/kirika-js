import { Query } from '@nestjs/cqrs'
import { LorebookVisibility } from '~/lorebook/domain/entities/lorebook.entity'
import { LorebookListItem } from '../ports/lorebook-list-read.port'

export interface LorebookPageResult {
	items: LorebookListItem[]
	pagination: {
		page: number
		pageSize: number
		total: number
		totalPages: number
	}
}

export class GetMyLorebooksQuery extends Query<LorebookPageResult> {
	constructor(
		readonly ownerId: string,
		readonly page: number,
		readonly pageSize: number,
		readonly visibility?: LorebookVisibility,
	) {
		super()
	}
}
