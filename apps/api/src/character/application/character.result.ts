import type { CharacterRevisionAsset } from '../domain/assets.entity'
import type { Character } from '../domain/character.entity'
import type { CharacterRevision } from '../domain/character-revision.entity'

export interface CharacterRevisionAssetResult {
	assetId: string
	kind: CharacterRevisionAsset['kind']
	name: string
	uri: string
	ordinal: number
	extensions: Readonly<Record<string, unknown>>
}

export interface CharacterLorebookReferenceResult {
	lorebookRevisionId: string
	ordinal: number
	enabled: boolean
}

export interface CharacterRevisionResult {
	id: string
	revisionNumber: number
	isDraft: boolean
	name: string
	description: string
	personality: string
	scenario: string
	systemPrompt: string
	postHistoryInstructions: string
	greetings: string[]
	examples: string[]
	extensions: Readonly<Record<string, unknown>>
	assets: CharacterRevisionAssetResult[]
	lorebooks: CharacterLorebookReferenceResult[]
	createdAt: Date
	updatedAt: Date
}

export interface CharacterResult {
	id: string
	ownerId: string
	alias: string | null
	currentRevisionId: string | null
	draftRevisionId: string | null
	revisions: CharacterRevisionResult[]
	createdAt: Date
	updatedAt: Date
}

export function toCharacterRevisionResult(
	revision: CharacterRevision,
): CharacterRevisionResult {
	return {
		id: revision.id.value,
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
	}
}

export function toCharacterResult(character: Character): CharacterResult {
	return {
		id: character.id.value,
		ownerId: character.ownerId.value,
		alias: character.alias,
		currentRevisionId: character.currentRevision?.id.value ?? null,
		draftRevisionId: character.draftRevision?.id.value ?? null,
		revisions: [...character.revisions]
			.sort((a, b) => a.revisionNumber - b.revisionNumber)
			.map(toCharacterRevisionResult),
		createdAt: character.createdAt,
		updatedAt: character.updatedAt,
	}
}
