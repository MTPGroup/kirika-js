import {
	LOREBOOK_REPOSITORY_PORT,
	LorebookId,
	type LorebookRepositoryPort,
} from '@kirika-js/domain/lorebook'
import { Inject, NotFoundException } from '@nestjs/common'
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs'
import { GetLorebookQuery, type GetLorebookResult } from './get-lorebook.query'

@QueryHandler(GetLorebookQuery)
export class GetLorebookHandler implements IQueryHandler<GetLorebookQuery> {
	constructor(
		@Inject(LOREBOOK_REPOSITORY_PORT)
		private readonly lorebookRepository: LorebookRepositoryPort,
	) {}

	async execute(query: GetLorebookQuery): Promise<GetLorebookResult> {
		const lorebook = await this.lorebookRepository.findById(
			new LorebookId(query.id),
		)
		const isOwner = lorebook?.ownerId.value === query.requesterId

		if (!lorebook || (!isOwner && lorebook.visibility === 'private')) {
			throw new NotFoundException('世界书不存在')
		}

		const visibleRevisions = isOwner
			? lorebook.revisions
			: lorebook.currentRevision
				? [lorebook.currentRevision]
				: []

		return {
			id: lorebook.id.value,
			ownerId: lorebook.ownerId.value,
			name: lorebook.name,
			description: lorebook.description,
			visibility: lorebook.visibility,
			currentRevisionId: lorebook.currentRevision?.id.value ?? null,
			draftRevisionId: isOwner
				? (lorebook.draftRevision?.id.value ?? null)
				: null,
			revisions: [...visibleRevisions]
				.sort((a, b) => a.revisionNumber - b.revisionNumber)
				.map((revision) => ({
					id: revision.id.value,
					revisionNumber: revision.revisionNumber,
					isDraft: revision.isDraft,
					entries: revision.entries.map((entry) => ({
						id: entry.id.value,
						keys: [...entry.keys],
						title: entry.title,
						enabled: entry.enabled,
						content: entry.content,
						position: entry.position,
						priority: entry.priority,
					})),
				})),
			createdAt: lorebook.createdAt,
			updatedAt: lorebook.updatedAt,
		}
	}
}
