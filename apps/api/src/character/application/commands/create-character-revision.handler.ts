import { ConflictException, Inject } from '@nestjs/common'
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs'
import {
	CHARACTER_REPOSITORY_PORT,
	type CharacterRepositoryPort,
} from '../../domain/ports/character-repository.port'
import { type CharacterResult, toCharacterResult } from '../character.result'
import { loadOwnedCharacter } from '../services/load-owned-character'
import { CreateCharacterRevisionCommand } from './create-character-revision.command'

@CommandHandler(CreateCharacterRevisionCommand)
export class CreateCharacterRevisionHandler
	implements ICommandHandler<CreateCharacterRevisionCommand>
{
	constructor(
		@Inject(CHARACTER_REPOSITORY_PORT)
		private readonly characterRepository: CharacterRepositoryPort,
	) {}

	async execute(
		command: CreateCharacterRevisionCommand,
	): Promise<CharacterResult> {
		const character = await loadOwnedCharacter(
			this.characterRepository,
			command.characterId,
			command.requesterId,
		)

		if (character.draftRevision) {
			throw new ConflictException('该角色已存在草稿版本')
		}

		character.createNewDraftRevision()
		await this.characterRepository.save(character)

		return toCharacterResult(character)
	}
}
