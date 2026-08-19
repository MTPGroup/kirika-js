import { Inject, Injectable } from '@nestjs/common'
import { UserId } from '~/auth/user-id.vo'
import { Lorebook } from '~/lorebook/domain/entities/lorebook.entity'
import {
	LOREBOOK_REPOSITORY_PORT,
	type LorebookRepositoryPort,
} from '~/lorebook/domain/ports/lorebook-repository.port'
import { CreateLorebookDto } from '../dtos/create-lorebook.dto'

@Injectable()
export class CreateLorebookUseCase {
	constructor(
		@Inject(LOREBOOK_REPOSITORY_PORT)
		private readonly lorebookRepository: LorebookRepositoryPort,
	) {}

	async execute(dto: CreateLorebookDto, ownerId: string) {
		const lorebook = Lorebook.create(
			dto.name,
			dto.description,
			new UserId(ownerId),
		)

		await this.lorebookRepository.save(lorebook)
	}
}
