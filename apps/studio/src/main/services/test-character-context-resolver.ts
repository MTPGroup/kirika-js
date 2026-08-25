import type {
  ChatCharacterContextResolverPort,
  ResolvedChatCharacterContext,
} from '@kirika-js/core/chat'
import {
  type CharacterId,
  CharacterLorebookReference,
  CharacterRevision,
  type CharacterRevisionId,
} from '@kirika-js/core/domain/character'
import {
  type LorebookRevision,
  LorebookRevisionId,
} from '@kirika-js/core/domain/lorebook'
import type { GenerationContextOverrideDto } from '~/shared/ipc'
import type { StudioRuntime } from '../studio-runtime'

export class TestCharacterContextResolver
  implements ChatCharacterContextResolverPort
{
  constructor(
    private readonly runtime: StudioRuntime,
    private readonly override: GenerationContextOverrideDto,
  ) {}

  async resolve(
    characterId: CharacterId,
    characterRevisionId: CharacterRevisionId,
  ): Promise<ResolvedChatCharacterContext | null> {
    const character =
      await this.runtime.characterRepository.findById(characterId)
    const revision = character?.findRevision(characterRevisionId)
    if (!revision) return null

    const allLorebooks = await this.runtime.lorebookRepository.findAll()
    const byRevisionId = new Map(
      allLorebooks.flatMap((book) =>
        book.revisions.map((value) => [value.id.value, value] as const),
      ),
    )
    const ids = this.override.includeCharacterLorebooks
      ? [
          ...revision.lorebooks
            .filter((reference) => reference.enabled)
            .sort((a, b) => a.ordinal - b.ordinal)
            .map((reference) => reference.lorebookRevisionId.value),
          ...this.override.lorebookRevisionIds,
        ]
      : [...this.override.lorebookRevisionIds]
    const lorebooks: LorebookRevision[] = []
    for (const id of new Set(ids)) {
      const value = byRevisionId.get(new LorebookRevisionId(id).value)
      if (!value) throw new Error(`测试世界书版本不存在: ${id}`)
      lorebooks.push(value)
    }
    const testRevision = CharacterRevision.reconstitute({
      id: revision.id,
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
      assets: revision.assets,
      lorebooks: lorebooks.map(
        (lorebook, ordinal) =>
          new CharacterLorebookReference({
            lorebookRevisionId: lorebook.id,
            ordinal,
            enabled: true,
          }),
      ),
      createdAt: revision.createdAt,
      updatedAt: revision.updatedAt,
    })
    return { revision: testRevision, lorebooks }
  }
}
