import { Inject } from '@nestjs/common'
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs'
import {
	CHARACTER_REPOSITORY_PORT,
	type CharacterRepositoryPort,
} from '../../domain/ports/character-repository.port'
import { loadOwnedCharacter } from '../services/load-owned-character'
import { DeleteCharacterCommand } from './delete-character.command'

@CommandHandler(DeleteCharacterCommand)
export class DeleteCharacterHandler
	implements ICommandHandler<DeleteCharacterCommand>
{
	constructor(
		@Inject(CHARACTER_REPOSITORY_PORT)
		private readonly characterRepository: CharacterRepositoryPort,
	) {}

	async execute(command: DeleteCharacterCommand): Promise<void> {
		const character = await loadOwnedCharacter(
			this.characterRepository,
			command.characterId,
			command.requesterId,
		)

		await this.characterRepository.delete(character.id)
	}
}
