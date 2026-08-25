import type {
  AssetKind,
  CharacterRevisionContent,
} from '@kirika-js/core/domain/character'
import {
  AssetId,
  CharacterLorebookReference,
  CharacterRevisionAsset,
} from '@kirika-js/core/domain/character'
import { LorebookRevisionId } from '@kirika-js/core/domain/lorebook'

export interface CharacterRevisionAssetInput {
  assetId: string
  kind: AssetKind
  name: string
  uri: string
  ordinal: number
  extensions: Readonly<Record<string, unknown>>
}

export interface CharacterLorebookReferenceInput {
  lorebookRevisionId: string
  ordinal: number
  enabled: boolean
}

export interface CharacterRevisionInput {
  name: string
  description: string
  personality: string
  scenario: string
  systemPrompt: string
  postHistoryInstructions: string
  greetings: string[]
  examples: string[]
  extensions: Readonly<Record<string, unknown>>
  assets: CharacterRevisionAssetInput[]
  lorebooks: CharacterLorebookReferenceInput[]
}

export function toCharacterRevisionContent(
  input: CharacterRevisionInput,
): CharacterRevisionContent {
  return {
    name: input.name,
    description: input.description,
    personality: input.personality,
    scenario: input.scenario,
    systemPrompt: input.systemPrompt,
    postHistoryInstructions: input.postHistoryInstructions,
    greetings: input.greetings,
    examples: input.examples,
    extensions: input.extensions,
    assets: input.assets.map(
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
    lorebooks: input.lorebooks.map(
      (reference) =>
        new CharacterLorebookReference({
          lorebookRevisionId: new LorebookRevisionId(
            reference.lorebookRevisionId,
          ),
          ordinal: reference.ordinal,
          enabled: reference.enabled,
        }),
    ),
  }
}
