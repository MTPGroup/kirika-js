import {
  CHARACTER_REPOSITORY_PORT,
  type CharacterRepositoryPort,
} from '@kirika-js/core/domain/character'
import { Inject } from '@nestjs/common'
import { CommandHandler, type ICommandHandler } from '@nestjs/cqrs'
import { type CharacterResult, toCharacterResult } from '../character.result'
import { loadOwnedCharacter } from '../services/load-owned-character'
import { UpdateCharacterCommand } from './update-character.command'

@CommandHandler(UpdateCharacterCommand)
export class UpdateCharacterHandler
  implements ICommandHandler<UpdateCharacterCommand>
{
  constructor(
    @Inject(CHARACTER_REPOSITORY_PORT)
    private readonly characterRepository: CharacterRepositoryPort,
  ) {}

  async execute(command: UpdateCharacterCommand): Promise<CharacterResult> {
    const character = await loadOwnedCharacter(
      this.characterRepository,
      command.characterId,
      command.requesterId,
    )

    character.changeAlias(command.alias)
    await this.characterRepository.save(character)

    return toCharacterResult(character)
  }
}
