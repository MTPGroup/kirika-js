import { Command } from '@nestjs/cqrs'
import type { CharacterResult } from '../character.result'
import type { CharacterRevisionInput } from '../character-revision.input'

export class SyncCharacterRevisionCommand extends Command<CharacterResult> {
  constructor(
    readonly characterId: string,
    readonly revisionId: string,
    readonly requesterId: string,
    readonly revision: CharacterRevisionInput,
  ) {
    super()
  }
}
