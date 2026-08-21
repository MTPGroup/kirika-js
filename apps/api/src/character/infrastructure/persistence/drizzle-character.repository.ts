import { Injectable } from '@nestjs/common'
import { eq } from 'drizzle-orm'
import { DrizzleService } from '~/shared/infrastructure/drizzle/drizzle.service'
import { Character, CharacterId } from '../../domain/character.entity'
import { CharacterRepositoryPort } from '../../domain/ports/character-repository.port'
import {
	characterRevisionAssets,
	characterRevisionLorebooks,
	characterRevisions,
	characters,
} from './character.drizzle-schema'
import { CharacterMapper } from './character.mapper'
import { findCharacterByIdQuery } from './character.query'

@Injectable()
export class DrizzleCharacterRepository implements CharacterRepositoryPort {
	constructor(private readonly drizzleService: DrizzleService) {}

	async findById(id: CharacterId): Promise<Character | null> {
		const raw = await findCharacterByIdQuery(this.drizzleService.db, id.value)
		return raw ? CharacterMapper.toDomain(raw) : null
	}

	async save(character: Character): Promise<void> {
		const characterModel = CharacterMapper.toCharacterPersistence(character)
		const revisionToSave = character.draftRevision ?? character.currentRevision

		await this.drizzleService.db.transaction(async (tx) => {
			await tx
				.insert(characters)
				.values(characterModel)
				.onConflictDoUpdate({
					target: characters.id,
					set: {
						alias: characterModel.alias,
						currentRevisionId: characterModel.currentRevisionId,
						updatedAt: characterModel.updatedAt,
					},
				})

			if (!revisionToSave) return

			const model = CharacterMapper.toCharacterRevisionPersistence(
				character.id,
				revisionToSave,
			)

			await tx
				.insert(characterRevisions)
				.values(model.revision)
				.onConflictDoUpdate({
					target: characterRevisions.id,
					set: {
						isDraft: model.revision.isDraft,
						name: model.revision.name,
						description: model.revision.description,
						personality: model.revision.personality,
						scenario: model.revision.scenario,
						systemPrompt: model.revision.systemPrompt,
						postHistoryInstructions: model.revision.postHistoryInstructions,
						greetings: model.revision.greetings,
						examples: model.revision.examples,
						extensions: model.revision.extensions,
						updatedAt: model.revision.updatedAt,
					},
					setWhere: eq(characterRevisions.isDraft, true),
				})

			// 发布时只翻转 is_draft；关联内容已在草稿同步阶段保存。
			if (!revisionToSave.isDraft) return

			await tx
				.delete(characterRevisionAssets)
				.where(eq(characterRevisionAssets.revisionId, revisionToSave.id.value))
			if (model.assets.length > 0) {
				await tx.insert(characterRevisionAssets).values(model.assets)
			}

			await tx
				.delete(characterRevisionLorebooks)
				.where(
					eq(
						characterRevisionLorebooks.characterRevisionId,
						revisionToSave.id.value,
					),
				)
			if (model.lorebooks.length > 0) {
				await tx.insert(characterRevisionLorebooks).values(model.lorebooks)
			}
		})
	}

	async delete(id: CharacterId): Promise<void> {
		await this.drizzleService.db
			.delete(characters)
			.where(eq(characters.id, id.value))
	}
}
