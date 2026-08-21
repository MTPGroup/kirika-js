import {
	BadRequestException,
	ConflictException,
	Inject,
	NotFoundException,
} from '@nestjs/common'
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs'
import { CharacterRevisionId } from '../../domain/character-revision.entity'
import {
	CHARACTER_REPOSITORY_PORT,
	type CharacterRepositoryPort,
} from '../../domain/ports/character-repository.port'
import { type CharacterResult, toCharacterResult } from '../character.result'
import { loadOwnedCharacter } from '../services/load-owned-character'
import { PublishCharacterRevisionCommand } from './publish-character-revision.command'

@CommandHandler(PublishCharacterRevisionCommand)
export class PublishCharacterRevisionHandler
	implements ICommandHandler<PublishCharacterRevisionCommand>
{
	constructor(
		@Inject(CHARACTER_REPOSITORY_PORT)
		private readonly characterRepository: CharacterRepositoryPort,
	) {}

	async execute(
		command: PublishCharacterRevisionCommand,
	): Promise<CharacterResult> {
		const character = await loadOwnedCharacter(
			this.characterRepository,
			command.characterId,
			command.requesterId,
		)
		const revisionId = new CharacterRevisionId(command.revisionId)
		const revision = character.findRevision(revisionId)

		if (!revision) throw new NotFoundException('角色版本不存在')
		if (!revision.isDraft) {
			throw new ConflictException('只能发布草稿版本')
		}
		if (revision.greetings.length === 0) {
			throw new BadRequestException('角色至少需要一条问候语才能发布')
		}

		character.publishRevision(revisionId)
		await this.characterRepository.save(character)

		return toCharacterResult(character)
	}
}
