import { Inject } from '@nestjs/common'
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs'
import { UserId } from '~/auth/user-id.vo'
import { Lorebook } from '~/lorebook/domain/entities/lorebook.entity'
import {
	LOREBOOK_REPOSITORY_PORT,
	type LorebookRepositoryPort,
} from '~/lorebook/domain/ports/lorebook-repository.port'
import {
	CreateLorebookCommand,
	CreateLorebookResult,
} from './create-lorebook.command'

@CommandHandler(CreateLorebookCommand)
export class CreateLorebookHandler
	implements ICommandHandler<CreateLorebookCommand>
{
	constructor(
		@Inject(LOREBOOK_REPOSITORY_PORT)
		private readonly lorebookRepository: LorebookRepositoryPort,
	) {}

	async execute(command: CreateLorebookCommand): Promise<CreateLorebookResult> {
		const lorebook = Lorebook.create(
			command.name,
			command.description,
			new UserId(command.ownerId),
		)

		await this.lorebookRepository.save(lorebook)

		const draftRevision = lorebook.draftRevision
		if (!draftRevision) {
			throw new Error('新建世界书时未生成草稿版本')
		}

		return {
			id: lorebook.id.value,
			ownerId: lorebook.ownerId.value,
			name: lorebook.name,
			description: lorebook.description,
			draftRevisionId: draftRevision.id.value,
			currentRevisionId: lorebook.activeRevision?.id.value ?? null,
			createdAt: lorebook.createdAt,
			updatedAt: lorebook.updatedAt,
		}
	}
}
