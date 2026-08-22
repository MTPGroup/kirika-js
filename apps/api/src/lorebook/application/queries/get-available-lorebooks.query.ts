import { Query } from '@nestjs/cqrs'
import type { PageResult } from '~/shared/application/page-result.interface'
import type { LorebookListItem } from '../ports/lorebook-list-read.port'

export type GetAvailableLorebookPageResult = PageResult<LorebookListItem>

export class GetPublicLorebookQuery extends Query<GetAvailableLorebookPageResult> {
  constructor(
    readonly page: number,
    readonly pageSize: number,
    readonly ownerId: string | null = null,
  ) {
    super()
  }
}
