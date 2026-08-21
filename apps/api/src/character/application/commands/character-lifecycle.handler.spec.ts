import {
	BadRequestException,
	ConflictException,
	ForbiddenException,
	NotFoundException,
} from '@nestjs/common'
import { beforeEach, describe, expect, it } from 'vitest'
import { UserId } from '~/auth/user-id.vo'
import { Character, CharacterId } from '../../domain/character.entity'
import type { CharacterRepositoryPort } from '../../domain/ports/character-repository.port'
import type { CharacterRevisionInput } from '../character-revision.input'
import { CreateCharacterRevisionCommand } from './create-character-revision.command'
import { CreateCharacterRevisionHandler } from './create-character-revision.handler'
import { DeleteCharacterCommand } from './delete-character.command'
import { DeleteCharacterHandler } from './delete-character.handler'
import { PublishCharacterRevisionCommand } from './publish-character-revision.command'
import { PublishCharacterRevisionHandler } from './publish-character-revision.handler'
import { SyncCharacterRevisionCommand } from './sync-character-revision.command'
import { SyncCharacterRevisionHandler } from './sync-character-revision.handler'

const ownerId = '11111111-1111-4111-8111-111111111111'
const otherUserId = '22222222-2222-4222-8222-222222222222'

const revisionInput: CharacterRevisionInput = {
	name: 'Kirika',
	description: '角色描述',
	personality: '冷静',
	scenario: '测试场景',
	systemPrompt: '保持角色设定',
	postHistoryInstructions: '简洁回复',
	greetings: ['你好，旅行者。'],
	examples: ['用户：你好\nKirika：你好。'],
	extensions: { source: 'test' },
	assets: [],
	lorebooks: [],
}

class InMemoryCharacterRepository implements CharacterRepositoryPort {
	saveCount = 0
	deletedId: string | null = null

	constructor(public character: Character | null) {}

	async findById(id: CharacterId): Promise<Character | null> {
		return this.character?.id.equals(id) ? this.character : null
	}

	async save(character: Character): Promise<void> {
		this.character = character
		this.saveCount += 1
	}

	async delete(id: CharacterId): Promise<void> {
		this.deletedId = id.value
		this.character = null
	}
}

describe('Character lifecycle handlers', () => {
	let character: Character
	let repository: InMemoryCharacterRepository
	let createRevisionHandler: CreateCharacterRevisionHandler
	let syncRevisionHandler: SyncCharacterRevisionHandler
	let publishRevisionHandler: PublishCharacterRevisionHandler
	let deleteCharacterHandler: DeleteCharacterHandler

	beforeEach(() => {
		character = Character.create({
			ownerId: new UserId(ownerId),
			alias: '测试角色',
			initialRevision: { name: '初始角色' },
		})
		repository = new InMemoryCharacterRepository(character)
		createRevisionHandler = new CreateCharacterRevisionHandler(repository)
		syncRevisionHandler = new SyncCharacterRevisionHandler(repository)
		publishRevisionHandler = new PublishCharacterRevisionHandler(repository)
		deleteCharacterHandler = new DeleteCharacterHandler(repository)
	})

	it('同步、发布角色版本并基于已发布版本创建新草稿', async () => {
		const initialDraft = character.draftRevision
		if (!initialDraft) throw new Error('测试角色缺少初始草稿')

		const synced = await syncRevisionHandler.execute(
			new SyncCharacterRevisionCommand(
				character.id.value,
				initialDraft.id.value,
				ownerId,
				revisionInput,
			),
		)
		expect(synced.revisions[0]).toMatchObject({
			id: initialDraft.id.value,
			name: 'Kirika',
			greetings: ['你好，旅行者。'],
			isDraft: true,
		})

		const published = await publishRevisionHandler.execute(
			new PublishCharacterRevisionCommand(
				character.id.value,
				initialDraft.id.value,
				ownerId,
			),
		)
		expect(published).toMatchObject({
			currentRevisionId: initialDraft.id.value,
			draftRevisionId: null,
		})

		const withNewDraft = await createRevisionHandler.execute(
			new CreateCharacterRevisionCommand(character.id.value, ownerId),
		)
		const newDraft = withNewDraft.revisions.find((revision) => revision.isDraft)
		expect(newDraft).toMatchObject({
			revisionNumber: 2,
			name: 'Kirika',
			greetings: ['你好，旅行者。'],
		})
		expect(newDraft?.id).not.toBe(initialDraft.id.value)
		expect(repository.saveCount).toBe(3)
	})

	it('拒绝缺少问候语、错误版本和已发布版本的非法操作', async () => {
		const draft = character.draftRevision
		if (!draft) throw new Error('测试角色缺少初始草稿')

		await expect(
			publishRevisionHandler.execute(
				new PublishCharacterRevisionCommand(
					character.id.value,
					draft.id.value,
					ownerId,
				),
			),
		).rejects.toBeInstanceOf(BadRequestException)

		await expect(
			syncRevisionHandler.execute(
				new SyncCharacterRevisionCommand(
					character.id.value,
					'33333333-3333-4333-8333-333333333333',
					ownerId,
					revisionInput,
				),
			),
		).rejects.toBeInstanceOf(NotFoundException)

		await syncRevisionHandler.execute(
			new SyncCharacterRevisionCommand(
				character.id.value,
				draft.id.value,
				ownerId,
				revisionInput,
			),
		)
		await publishRevisionHandler.execute(
			new PublishCharacterRevisionCommand(
				character.id.value,
				draft.id.value,
				ownerId,
			),
		)

		await expect(
			syncRevisionHandler.execute(
				new SyncCharacterRevisionCommand(
					character.id.value,
					draft.id.value,
					ownerId,
					revisionInput,
				),
			),
		).rejects.toBeInstanceOf(ConflictException)
		await expect(
			publishRevisionHandler.execute(
				new PublishCharacterRevisionCommand(
					character.id.value,
					draft.id.value,
					ownerId,
				),
			),
		).rejects.toBeInstanceOf(ConflictException)
	})

	it('所有生命周期操作都拒绝非所有者且不会持久化', async () => {
		const draft = character.draftRevision
		if (!draft) throw new Error('测试角色缺少初始草稿')

		await expect(
			createRevisionHandler.execute(
				new CreateCharacterRevisionCommand(character.id.value, otherUserId),
			),
		).rejects.toBeInstanceOf(ForbiddenException)
		await expect(
			syncRevisionHandler.execute(
				new SyncCharacterRevisionCommand(
					character.id.value,
					draft.id.value,
					otherUserId,
					revisionInput,
				),
			),
		).rejects.toBeInstanceOf(ForbiddenException)
		await expect(
			publishRevisionHandler.execute(
				new PublishCharacterRevisionCommand(
					character.id.value,
					draft.id.value,
					otherUserId,
				),
			),
		).rejects.toBeInstanceOf(ForbiddenException)
		await expect(
			deleteCharacterHandler.execute(
				new DeleteCharacterCommand(character.id.value, otherUserId),
			),
		).rejects.toBeInstanceOf(ForbiddenException)

		expect(repository.saveCount).toBe(0)
		expect(repository.deletedId).toBeNull()
	})

	it('删除角色并在资源不存在时返回 404', async () => {
		await deleteCharacterHandler.execute(
			new DeleteCharacterCommand(character.id.value, ownerId),
		)

		expect(repository.deletedId).toBe(character.id.value)
		await expect(
			deleteCharacterHandler.execute(
				new DeleteCharacterCommand(character.id.value, ownerId),
			),
		).rejects.toBeInstanceOf(NotFoundException)
	})
})
