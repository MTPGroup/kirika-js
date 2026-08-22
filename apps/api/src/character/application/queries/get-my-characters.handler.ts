import { Inject } from '@nestjs/common'
import { type IQueryHandler, QueryHandler } from '@nestjs/cqrs'
import {
  CHARACTER_LIST_READ_PORT,
  type CharacterListReadPort,
} from '../ports/character-list-read.port'
import {
  type CharacterPageResult,
  GetMyCharactersQuery,
} from './get-my-characters.query'

@QueryHandler(GetMyCharactersQuery)
export class GetMyCharactersHandler
  implements IQueryHandler<GetMyCharactersQuery>
{
  constructor(
    @Inject(CHARACTER_LIST_READ_PORT)
    private readonly characterListRead: CharacterListReadPort,
  ) {}

  async execute(query: GetMyCharactersQuery): Promise<CharacterPageResult> {
    const { items, total } = await this.characterListRead.findMyCharacters({
      ownerId: query.ownerId,
      offset: (query.page - 1) * query.pageSize,
      limit: query.pageSize,
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
