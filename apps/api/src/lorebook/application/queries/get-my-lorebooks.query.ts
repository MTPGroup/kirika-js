import { LorebookVisibility } from '@kirika-js/domain/lorebook'
import { Query } from '@nestjs/cqrs'
import { PageResult } from '~/shared/application/page-result.interface'
import { LorebookListItem } from '../ports/lorebook-list-read.port'

export type LorebookPageResult = PageResult<LorebookListItem>

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
