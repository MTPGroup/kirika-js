import { Inject } from '@nestjs/common'
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs'
import { UserId } from '~/auth/user-id.vo'
import { Character } from '../../domain/character.entity'
import {
	CHARACTER_REPOSITORY_PORT,
	type CharacterRepositoryPort,
} from '../../domain/ports/character-repository.port'
import { type CharacterResult, toCharacterResult } from '../character.result'
import { toCharacterRevisionContent } from '../character-revision.input'
import { CreateCharacterCommand } from './create-character.command'

@CommandHandler(CreateCharacterCommand)
export class CreateCharacterHandler
	implements ICommandHandler<CreateCharacterCommand>
{
	constructor(
		@Inject(CHARACTER_REPOSITORY_PORT)
		private readonly characterRepository: CharacterRepositoryPort,
	) {}

	async execute(command: CreateCharacterCommand): Promise<CharacterResult> {
		const character = Character.create({
			ownerId: new UserId(command.ownerId),
			alias: command.alias,
			initialRevision: toCharacterRevisionContent(command.revision),
		})

		await this.characterRepository.save(character)
		return toCharacterResult(character)
	}
}
