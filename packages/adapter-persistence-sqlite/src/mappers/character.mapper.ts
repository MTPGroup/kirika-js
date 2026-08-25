/** biome-ignore-all lint/complexity/noStaticOnlyClass: 实例类允许只有静态方法 */
import {
  AssetId,
  Character,
  CharacterId,
  CharacterLorebookReference,
  CharacterRevision,
  CharacterRevisionAsset,
  CharacterRevisionId,
} from '@kirika-js/core/domain/character'
import { LorebookRevisionId } from '@kirika-js/core/domain/lorebook'
import { UserId } from '@kirika-js/core/domain/shared'
import type {
  characterRevisionAssets,
  characterRevisionLorebooks,
  characterRevisions,
  characters,
} from '~/schema/character.schema'

type CharacterRow = typeof characters.$inferSelect
type RevisionRow = typeof characterRevisions.$inferSelect
type AssetRow = typeof characterRevisionAssets.$inferSelect
type LorebookRow = typeof characterRevisionLorebooks.$inferSelect

export interface CharacterPersistenceAggregate extends CharacterRow {
  revisions: Array<
    RevisionRow & {
      revisionAssets: AssetRow[]
      lorebookReferences: LorebookRow[]
    }
  >
}

export class CharacterMapper {
  static toDomain(raw: CharacterPersistenceAggregate): Character {
    return Character.reconstitute({
      id: new CharacterId(raw.id),
      ownerId: new UserId(raw.ownerId),
      alias: raw.alias,

      currentRevisionId: raw.currentRevisionId
        ? new CharacterRevisionId(raw.currentRevisionId)
        : null,

      revisions: raw.revisions.map((revision) =>
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
      ),
      createdAt: raw.createdAt,
      updatedAt: raw.updatedAt,
    })
  }

  static toCharacterPersistence(character: Character) {
    return {
      id: character.id.value,
      ownerId: character.ownerId.value,
      alias: character.alias,
      currentRevisionId: character.currentRevision?.id.value ?? null,
      createdAt: character.createdAt,
      updatedAt: character.updatedAt,
    }
  }

  static toRevisionPersistence(
    character: Character,
    revision: CharacterRevision,
  ) {
    return {
      revision: {
        id: revision.id.value,
        characterId: character.id.value,
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
