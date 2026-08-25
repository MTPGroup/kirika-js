import type { Character } from '@kirika-js/core/domain/character'

export function characterToJson(character: Character) {
  return {
    id: character.id.value,
    ownerId: character.ownerId.value,
    alias: character.alias,
    currentRevisionId: character.currentRevision?.id.value ?? null,
    revisions: character.revisions.map((revision) => ({
      id: revision.id.value,
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
      assets: revision.assets.map((asset) => ({
        assetId: asset.assetId.value,
        kind: asset.kind,
        name: asset.name,
        uri: asset.uri,
        ordinal: asset.ordinal,
        extensions: asset.extensions,
      })),
      lorebooks: revision.lorebooks.map((reference) => ({
        lorebookRevisionId: reference.lorebookRevisionId.value,
        ordinal: reference.ordinal,
        enabled: reference.enabled,
      })),
      createdAt: revision.createdAt,
      updatedAt: revision.updatedAt,
    })),
    createdAt: character.createdAt,
    updatedAt: character.updatedAt,
  }
}
