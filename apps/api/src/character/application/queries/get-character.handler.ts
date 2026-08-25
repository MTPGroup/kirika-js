import {
  CHARACTER_REPOSITORY_PORT,
  type CharacterRepositoryPort,
} from '@kirika-js/core/domain/character'
import { Inject } from '@nestjs/common'
import { type IQueryHandler, QueryHandler } from '@nestjs/cqrs'
import { type CharacterResult, toCharacterResult } from '../character.result'
import { loadOwnedCharacter } from '../services/load-owned-character'
import { GetCharacterQuery } from './get-character.query'

@QueryHandler(GetCharacterQuery)
export class GetCharacterHandler implements IQueryHandler<GetCharacterQuery> {
  constructor(
    @Inject(CHARACTER_REPOSITORY_PORT)
    private readonly characterRepository: CharacterRepositoryPort,
  ) {}

  async execute(query: GetCharacterQuery): Promise<CharacterResult> {
    const character = await loadOwnedCharacter(
      this.characterRepository,
      query.characterId,
      query.requesterId,
    )

    return toCharacterResult(character)
  }
}
