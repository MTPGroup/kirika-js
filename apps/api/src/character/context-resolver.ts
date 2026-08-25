import type {
  ChatCharacterContextResolverPort,
  ResolvedChatCharacterContext,
} from '@kirika-js/core/chat'
import type { CharacterId } from '@kirika-js/core/domain/character'
import {
  CharacterRevision,
  CharacterRevisionId,
} from '@kirika-js/core/domain/character'
import { eq } from 'drizzle-orm'
import { characterRevisions } from '../db/character-schema'
import type { Db } from '../lib/db'

export class PgCharacterContextResolver
  implements ChatCharacterContextResolverPort
{
  constructor(private readonly db: Db) {}

  async resolve(
    characterId: CharacterId,
    characterRevisionId: CharacterRevisionId,
  ): Promise<ResolvedChatCharacterContext | null> {
    const [raw] = await this.db
      .select()
      .from(characterRevisions)
      .where(eq(characterRevisions.id, characterRevisionId.value))
      .limit(1)

    if (!raw || raw.characterId !== characterId.value) return null

    const revision = CharacterRevision.reconstitute({
      id: new CharacterRevisionId(raw.id),
      revisionNumber: raw.revisionNumber,
      isDraft: raw.isDraft,
      name: raw.name,
      description: raw.description,
      personality: raw.personality,
      scenario: raw.scenario,
      systemPrompt: raw.systemPrompt,
      postHistoryInstructions: raw.postHistoryInstructions,
      greetings: raw.greetings,
      examples: raw.examples,
      extensions: raw.extensions,
      assets: [],
      lorebooks: [],
      createdAt: raw.createdAt,
      updatedAt: raw.updatedAt,
    })

    return { revision, lorebooks: [] }
  }
}
