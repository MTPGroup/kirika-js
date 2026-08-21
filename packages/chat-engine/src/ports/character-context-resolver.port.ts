import type {
	CharacterId,
	CharacterRevision,
	CharacterRevisionId,
} from '@kirika-js/domain/character'
import type { LorebookRevision } from '@kirika-js/domain/lorebook'

export interface ResolvedChatCharacterContext {
	readonly revision: CharacterRevision
	readonly lorebooks: readonly LorebookRevision[]
}

export interface ChatCharacterContextResolverPort {
	resolve(
		characterId: CharacterId,
		characterRevisionId: CharacterRevisionId,
	): Promise<ResolvedChatCharacterContext | null>
}
