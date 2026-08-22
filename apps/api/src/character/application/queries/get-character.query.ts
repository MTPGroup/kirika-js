import { Query } from '@nestjs/cqrs'
import type { CharacterResult } from '../character.result'

export class GetCharacterQuery extends Query<CharacterResult> {
  constructor(
    readonly characterId: string,
    readonly requesterId: string,
  ) {
    super()
  }
}
