import { Injectable } from '@nestjs/common'
import { and, count, desc, eq, sql } from 'drizzle-orm'
import { alias } from 'drizzle-orm/pg-core'
import { DrizzleService } from '~/shared/infrastructure/drizzle/drizzle.service'
import type {
  CharacterListItem,
  CharacterListReadPort,
  FindMyCharactersInput,
} from '../../application/ports/character-list-read.port'
import { characterRevisions, characters } from './character.drizzle-schema'

const currentRevision = alias(characterRevisions, 'current_character_revision')
const draftRevision = alias(characterRevisions, 'draft_character_revision')

@Injectable()
export class DrizzleCharacterListReadAdapter implements CharacterListReadPort {
  constructor(private readonly drizzleService: DrizzleService) {}

  async findMyCharacters(
    input: FindMyCharactersInput,
  ): Promise<{ items: CharacterListItem[]; total: number }> {
    const db = this.drizzleService.db
    const where = eq(characters.ownerId, input.ownerId)

    const [items, totalRows] = await Promise.all([
      db
        .select({
          id: characters.id,
          ownerId: characters.ownerId,
          alias: characters.alias,
          currentRevisionId: characters.currentRevisionId,
          draftRevisionId: draftRevision.id,
          name: sql<string>`coalesce(${draftRevision.name}, ${currentRevision.name}, '')`,
          description: sql<string>`coalesce(${draftRevision.description}, ${currentRevision.description}, '')`,
          createdAt: characters.createdAt,
          updatedAt: characters.updatedAt,
        })
        .from(characters)
        .leftJoin(
          currentRevision,
          eq(currentRevision.id, characters.currentRevisionId),
        )
        .leftJoin(
          draftRevision,
          and(
            eq(draftRevision.characterId, characters.id),
            eq(draftRevision.isDraft, true),
          ),
        )
        .where(where)
        .orderBy(desc(characters.updatedAt), desc(characters.id))
        .limit(input.limit)
        .offset(input.offset),
      db.select({ total: count() }).from(characters).where(where),
    ])

    return {
      items,
      total: totalRows[0]?.total ?? 0,
    }
  }
}
