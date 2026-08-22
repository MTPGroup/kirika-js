import { Command } from '@nestjs/cqrs'
import type { CharacterResult } from '../character.result'

export class UpdateCharacterCommand extends Command<CharacterResult> {
  constructor(
    readonly characterId: string,
    readonly requesterId: string,
    readonly alias: string | null,
  ) {
    super()
  }
}
