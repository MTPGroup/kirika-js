import type {
  ChatCharacterContextResolverPort,
  ResolvedChatCharacterContext,
} from '@kirika-js/core/chat'
import type { CharacterId, CharacterRevisionId } from '@kirika-js/core/domain/character'
import { type LorebookRevision, LorebookRevisionId } from '@kirika-js/core/domain/lorebook'
import type { StudioRuntime } from '../studio-runtime'

export class SqliteCharacterContextResolver implements ChatCharacterContextResolverPort {
  constructor(private readonly runtime: StudioRuntime) {}
  async resolve(
    characterId: CharacterId,
    characterRevisionId: CharacterRevisionId,
  ): Promise<ResolvedChatCharacterContext | null> {
    const character = await this.runtime.characterRepository.findById(characterId)
    const revision = character?.findRevision(characterRevisionId)
    if (!revision) return null
    const lorebooks: LorebookRevision[] = []
    const allLorebooks = await this.runtime.lorebookRepository.findAll()
    for (const reference of revision.lorebooks
      .filter((r) => r.enabled)
      .sort((a, b) => a.ordinal - b.ordinal)) {
      const book = allLorebooks.find((item) =>
        item.findRevision(new LorebookRevisionId(reference.lorebookRevisionId.value)),
      )
      const loreRevision = book?.findRevision(
        new LorebookRevisionId(reference.lorebookRevisionId.value),
      )
      if (loreRevision) lorebooks.push(loreRevision)
    }
    return { revision, lorebooks }
  }
}
