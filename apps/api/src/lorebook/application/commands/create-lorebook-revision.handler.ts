import { ConflictException, Inject } from '@nestjs/common'
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs'
import {
	LOREBOOK_REPOSITORY_PORT,
	type LorebookRepositoryPort,
} from '~/lorebook/domain/ports/lorebook-repository.port'
import {
	type LorebookRevisionResult,
	toLorebookRevisionResult,
} from '../lorebook-revision.result'
import { loadOwnedLorebook } from '../services/load-owned-lorebook'
import { CreateLorebookRevisionCommand } from './create-lorebook-revision.command'

@CommandHandler(CreateLorebookRevisionCommand)
export class CreateLorebookRevisionHandler
	implements ICommandHandler<CreateLorebookRevisionCommand>
{
	constructor(
		@Inject(LOREBOOK_REPOSITORY_PORT)
		private readonly lorebookRepository: LorebookRepositoryPort,
	) {}

	async execute(
		command: CreateLorebookRevisionCommand,
	): Promise<LorebookRevisionResult> {
		const lorebook = await loadOwnedLorebook(
			this.lorebookRepository,
			command.lorebookId,
			command.requesterId,
		)

		if (lorebook.draftRevision) {
			throw new ConflictException('该世界书已存在草稿版本')
		}

		const revision = lorebook.createNewDraftRevision()
		await this.lorebookRepository.save(lorebook)

		return toLorebookRevisionResult(lorebook, revision)
	}
}
