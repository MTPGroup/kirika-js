import type {
  Character,
  CharacterId,
  CharacterRepositoryPort,
} from '@kirika-js/core/domain/character'
import { eq } from 'drizzle-orm'
import {
  characterRevisionAssets,
  characterRevisionLorebooks,
  characterRevisions,
  characters,
} from '../db/character-schema'
import type { Db } from '../lib/db'
import { CharacterMapper } from './mapper'
import { findCharacterByIdQuery } from './query'

export class PgCharacterRepository implements CharacterRepositoryPort {
  constructor(private readonly db: Db) {}

  async findById(id: CharacterId): Promise<Character | null> {
    const raw = await findCharacterByIdQuery(this.db, id.value)
    return raw ? CharacterMapper.toDomain(raw) : null
  }

  async save(character: Character): Promise<void> {
    const characterModel = CharacterMapper.toCharacterPersistence(character)
    const revisionToSave = character.draftRevision ?? character.currentRevision

    await this.db.transaction(async (tx) => {
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
    await this.db.delete(characters).where(eq(characters.id, id.value))
  }

  async listByOwner(ownerId: string, limit: number, offset: number) {
    const rows = await this.db.query.characters.findMany({
      where: { ownerId },
      with: {
        currentRevision: true,
        revisions: true,
      },
      orderBy: (fields, { desc }) => desc(fields.updatedAt),
      limit: limit + 1,
      offset,
    })

    const hasMore = rows.length > limit
    const items = rows.slice(0, limit).map((row) => ({
      id: row.id,
      alias: row.alias,
      name:
        row.currentRevision?.name ??
        row.revisions.find((revision) => revision.isDraft)?.name ??
        null,
      currentRevisionId: row.currentRevisionId,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    }))

    return { items, hasMore }
  }
}
