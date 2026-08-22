import { Command } from '@nestjs/cqrs'
import type { CharacterResult } from '../character.result'

export class PublishCharacterRevisionCommand extends Command<CharacterResult> {
  constructor(
    readonly characterId: string,
    readonly revisionId: string,
    readonly requesterId: string,
  ) {
    super()
  }
}
