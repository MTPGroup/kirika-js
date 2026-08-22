import { Query } from '@nestjs/cqrs'
import type { PageResult } from '~/shared/application/page-result.interface'
import type { CharacterListItem } from '../ports/character-list-read.port'

export type CharacterPageResult = PageResult<CharacterListItem>

export class GetMyCharactersQuery extends Query<CharacterPageResult> {
  constructor(
    readonly ownerId: string,
    readonly page: number,
    readonly pageSize: number,
  ) {
    super()
  }
}
