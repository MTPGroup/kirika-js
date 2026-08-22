/** biome-ignore-all lint/complexity/noStaticOnlyClass: 实例类允许只有静态方法 */

import {
  AssetId,
  Character,
  CharacterId,
  CharacterLorebookReference,
  CharacterRevision,
  CharacterRevisionAsset,
  CharacterRevisionId,
} from '@kirika-js/domain/character'
import { LorebookRevisionId } from '@kirika-js/domain/lorebook'
import { UserId } from '~/auth/user-id.vo'
import type {
  characterRevisionAssets,
  characterRevisionLorebooks,
  characterRevisions,
  characters,
} from './character.drizzle-schema'
import type { DrizzleCharacterWithRelations } from './character.query'

export type DrizzleCharacterInsert = typeof characters.$inferInsert
export type DrizzleCharacterRevisionInsert =
  typeof characterRevisions.$inferInsert
export type DrizzleCharacterRevisionAssetInsert =
  typeof characterRevisionAssets.$inferInsert
export type DrizzleCharacterLorebookInsert =
  typeof characterRevisionLorebooks.$inferInsert

export interface CharacterRevisionPersistenceModel {
  revision: DrizzleCharacterRevisionInsert
  assets: DrizzleCharacterRevisionAssetInsert[]
  lorebooks: DrizzleCharacterLorebookInsert[]
}

export class CharacterMapper {
  static toDomain(raw: DrizzleCharacterWithRelations): Character {
    const revisions = raw.revisions.map((revision) =>
      CharacterRevision.reconstitute({
        id: new CharacterRevisionId(revision.id),
        revisionNumber: revision.revisionNumber,
        isDraft: revision.isDraft,
        name: revision.name,
        description: revision.description,
        personality: revision.personality,
        scenario: revision.scenario,
        systemPrompt: revision.systemPrompt,
        postHistoryInstructions: revision.postHistoryInstructions,
        greetings: revision.greetings,
        examples: revision.examples,
        extensions: revision.extensions,
        assets: revision.revisionAssets.map(
          (asset) =>
            new CharacterRevisionAsset({
              assetId: new AssetId(asset.assetId),
              kind: asset.kind,
              name: asset.name,
              uri: asset.uri,
              ordinal: asset.ordinal,
              extensions: asset.extensions,
            }),
        ),
        lorebooks: revision.lorebookReferences.map(
          (reference) =>
            new CharacterLorebookReference({
              lorebookRevisionId: new LorebookRevisionId(
                reference.lorebookRevisionId,
              ),
              ordinal: reference.ordinal,
              enabled: reference.enabled,
            }),
        ),
        createdAt: revision.createdAt,
        updatedAt: revision.updatedAt,
      }),
    )

    return Character.reconstitute({
      id: new CharacterId(raw.id),
      ownerId: new UserId(raw.ownerId),
      alias: raw.alias,
      currentRevisionId: raw.currentRevisionId
        ? new CharacterRevisionId(raw.currentRevisionId)
        : null,
      revisions,
      createdAt: raw.createdAt,
      updatedAt: raw.updatedAt,
    })
  }

  static toCharacterPersistence(character: Character): DrizzleCharacterInsert {
    return {
      id: character.id.value,
      ownerId: character.ownerId.value,
      alias: character.alias,
      currentRevisionId: character.currentRevision?.id.value ?? null,
      createdAt: character.createdAt,
      updatedAt: character.updatedAt,
    }
  }

  static toCharacterRevisionPersistence(
    characterId: CharacterId,
    revision: CharacterRevision,
  ): CharacterRevisionPersistenceModel {
    return {
      revision: {
        id: revision.id.value,
        characterId: characterId.value,
        revisionNumber: revision.revisionNumber,
        isDraft: revision.isDraft,
        name: revision.name,
        description: revision.description,
        personality: revision.personality,
        scenario: revision.scenario,
        systemPrompt: revision.systemPrompt,
        postHistoryInstructions: revision.postHistoryInstructions,
        greetings: [...revision.greetings],
        examples: [...revision.examples],
        extensions: revision.extensions,
        createdAt: revision.createdAt,
        updatedAt: revision.updatedAt,
      },
      assets: revision.assets.map((asset) => ({
        revisionId: revision.id.value,
        assetId: asset.assetId.value,
        kind: asset.kind,
        name: asset.name,
        uri: asset.uri,
        ordinal: asset.ordinal,
        extensions: asset.extensions,
      })),
      lorebooks: revision.lorebooks.map((reference) => ({
        characterRevisionId: revision.id.value,
        lorebookRevisionId: reference.lorebookRevisionId.value,
        ordinal: reference.ordinal,
        enabled: reference.enabled,
      })),
    }
  }
}
