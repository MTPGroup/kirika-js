import type {
  Character,
  CharacterId,
  CharacterRepositoryPort,
} from '@kirika-js/domain/character'
import { eq, inArray } from 'drizzle-orm'
import type { SqliteDatabase } from '../database'
import { CharacterMapper } from '../mappers/character.mapper'
import {
  characterRevisionAssets,
  characterRevisionLorebooks,
  characterRevisions,
  characters,
} from '../schema/character.schema'

export class SqliteCharacterRepository implements CharacterRepositoryPort {
  constructor(private readonly db: SqliteDatabase) {}

  async findById(id: CharacterId): Promise<Character | null> {
    const [character] = await this.db
      .select()
      .from(characters)
      .where(eq(characters.id, id.value))
      .limit(1)

    if (!character) return null

    const revisions = await this.db
      .select()
      .from(characterRevisions)
      .where(eq(characterRevisions.characterId, id.value))
      .orderBy(characterRevisions.revisionNumber)

    const revisionIds = revisions.map((revision) => revision.id)

    const assets =
      revisionIds.length === 0
        ? []
        : await this.db
            .select()
            .from(characterRevisionAssets)
            .where(inArray(characterRevisionAssets.revisionId, revisionIds))

    const lorebooks =
      revisionIds.length === 0
        ? []
        : await this.db
            .select()
            .from(characterRevisionLorebooks)
            .where(
              inArray(
                characterRevisionLorebooks.characterRevisionId,
                revisionIds,
              ),
            )

    return CharacterMapper.toDomain({
      ...character,

      revisions: revisions.map((revision) => ({
        ...revision,

        revisionAssets: assets.filter(
          (asset) => asset.revisionId === revision.id,
        ),

        lorebookReferences: lorebooks.filter(
          (reference) => reference.characterRevisionId === revision.id,
        ),
      })),
    })
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

      const model = CharacterMapper.toRevisionPersistence(
        character,
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
}
