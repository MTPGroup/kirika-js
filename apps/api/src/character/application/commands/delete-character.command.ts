import { Command } from '@nestjs/cqrs'

export class DeleteCharacterCommand extends Command<void> {
  constructor(
    readonly characterId: string,
    readonly requesterId: string,
  ) {
    super()
  }
}
