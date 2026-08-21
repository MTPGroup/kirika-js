import { Inject } from '@nestjs/common'
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs'
import {
	CHARACTER_REPOSITORY_PORT,
	type CharacterRepositoryPort,
} from '../../domain/ports/character-repository.port'
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
