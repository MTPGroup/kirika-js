import type { LorebookRepositoryPort } from '@kirika-js/domain/lorebook'
import { Lorebook, LorebookId } from '@kirika-js/domain/lorebook'
import {
	BadRequestException,
	ConflictException,
	ForbiddenException,
	NotFoundException,
} from '@nestjs/common'
import { beforeEach, describe, expect, it } from 'vitest'
import { UserId } from '~/auth/user-id.vo'
import { CreateLorebookRevisionCommand } from './create-lorebook-revision.command'
import { CreateLorebookRevisionHandler } from './create-lorebook-revision.handler'
import { DeleteLorebookCommand } from './delete-lorebook.command'
import { DeleteLorebookHandler } from './delete-lorebook.handler'
import { PublishLorebookRevisionCommand } from './publish-lorebook-revision.command'
import { PublishLorebookRevisionHandler } from './publish-lorebook-revision.handler'
import { SyncLorebookEntriesCommand } from './sync-lorebook-entries.command'
import { SyncLorebookEntriesHandler } from './sync-lorebook-entries.handler'

class InMemoryLorebookRepository implements LorebookRepositoryPort {
	saveCount = 0
	deletedId: string | null = null

	constructor(public lorebook: Lorebook | null) {}

	async findById(id: LorebookId): Promise<Lorebook | null> {
		return this.lorebook?.id.equals(id) ? this.lorebook : null
	}

	async save(lorebook: Lorebook): Promise<void> {
		this.lorebook = lorebook
		this.saveCount += 1
	}

	async delete(id: LorebookId): Promise<void> {
		this.deletedId = id.value
		this.lorebook = null
	}
}

describe('Lorebook lifecycle handlers', () => {
	let ownerId: string
	let lorebook: Lorebook
	let repository: InMemoryLorebookRepository
	let createRevisionHandler: CreateLorebookRevisionHandler
	let syncEntriesHandler: SyncLorebookEntriesHandler
	let publishRevisionHandler: PublishLorebookRevisionHandler
	let deleteLorebookHandler: DeleteLorebookHandler

	beforeEach(() => {
		ownerId = crypto.randomUUID()
		lorebook = Lorebook.create('测试世界书', '', new UserId(ownerId))
		repository = new InMemoryLorebookRepository(lorebook)
		createRevisionHandler = new CreateLorebookRevisionHandler(repository)
		syncEntriesHandler = new SyncLorebookEntriesHandler(repository)
		publishRevisionHandler = new PublishLorebookRevisionHandler(repository)
		deleteLorebookHandler = new DeleteLorebookHandler(repository)
	})

	it('同步条目、发布版本并从已发布版本创建新草稿', async () => {
		const initialDraft = lorebook.draftRevision
		if (!initialDraft) throw new Error('测试世界书缺少初始草稿')

		const synced = await syncEntriesHandler.execute(
			new SyncLorebookEntriesCommand(
				lorebook.id.value,
				initialDraft.id.value,
				ownerId,
				[
					{
						keys: ['  关键词  ', '关键词'],
						title: ' 初始条目 ',
						enabled: true,
						content: '条目内容',
						position: 'after_history',
						priority: 10,
					},
				],
			),
		)

		expect(synced.entries).toHaveLength(1)
		expect(synced.entries[0]).toMatchObject({
			keys: ['关键词'],
			title: '初始条目',
		})

		const published = await publishRevisionHandler.execute(
			new PublishLorebookRevisionCommand(
				lorebook.id.value,
				initialDraft.id.value,
				ownerId,
			),
		)

		expect(published).toMatchObject({
			id: initialDraft.id.value,
			isDraft: false,
			currentRevisionId: initialDraft.id.value,
		})

		const newDraft = await createRevisionHandler.execute(
			new CreateLorebookRevisionCommand(lorebook.id.value, ownerId),
		)

		expect(newDraft).toMatchObject({
			revisionNumber: 2,
			isDraft: true,
			currentRevisionId: initialDraft.id.value,
		})
		expect(newDraft.entries).toHaveLength(1)
		expect(newDraft.entries[0]?.id).not.toBe(synced.entries[0]?.id)
		expect(repository.saveCount).toBe(3)
	})

	it('拒绝非法的版本状态和不属于草稿的条目 ID', async () => {
		const draft = lorebook.draftRevision
		if (!draft) throw new Error('测试世界书缺少初始草稿')

		await expect(
			createRevisionHandler.execute(
				new CreateLorebookRevisionCommand(lorebook.id.value, ownerId),
			),
		).rejects.toBeInstanceOf(ConflictException)

		await expect(
			publishRevisionHandler.execute(
				new PublishLorebookRevisionCommand(
					lorebook.id.value,
					draft.id.value,
					ownerId,
				),
			),
		).rejects.toBeInstanceOf(BadRequestException)

		await expect(
			syncEntriesHandler.execute(
				new SyncLorebookEntriesCommand(
					lorebook.id.value,
					draft.id.value,
					ownerId,
					[
						{
							id: crypto.randomUUID(),
							keys: ['关键词'],
							title: '非法条目',
							enabled: true,
							content: '条目内容',
							position: 'after_history',
							priority: 0,
						},
					],
				),
			),
		).rejects.toBeInstanceOf(BadRequestException)

		await expect(
			syncEntriesHandler.execute(
				new SyncLorebookEntriesCommand(
					lorebook.id.value,
					crypto.randomUUID(),
					ownerId,
					[],
				),
			),
		).rejects.toBeInstanceOf(NotFoundException)
	})

	it('仅允许所有者删除世界书', async () => {
		await expect(
			deleteLorebookHandler.execute(
				new DeleteLorebookCommand(lorebook.id.value, crypto.randomUUID()),
			),
		).rejects.toBeInstanceOf(ForbiddenException)

		await deleteLorebookHandler.execute(
			new DeleteLorebookCommand(lorebook.id.value, ownerId),
		)

		expect(repository.deletedId).toBe(lorebook.id.value)
		await expect(
			deleteLorebookHandler.execute(
				new DeleteLorebookCommand(lorebook.id.value, ownerId),
			),
		).rejects.toBeInstanceOf(NotFoundException)
	})
})
