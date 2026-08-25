import {
  CHARACTER_REPOSITORY_PORT,
  type CharacterRepositoryPort,
  CharacterRevisionId,
} from '@kirika-js/core/domain/character'
import { ConflictException, Inject, NotFoundException } from '@nestjs/common'
import { CommandHandler, type ICommandHandler } from '@nestjs/cqrs'
import { type CharacterResult, toCharacterResult } from '../character.result'
import { toCharacterRevisionContent } from '../character-revision.input'
import { loadOwnedCharacter } from '../services/load-owned-character'
import { SyncCharacterRevisionCommand } from './sync-character-revision.command'

@CommandHandler(SyncCharacterRevisionCommand)
export class SyncCharacterRevisionHandler
  implements ICommandHandler<SyncCharacterRevisionCommand>
{
  constructor(
    @Inject(CHARACTER_REPOSITORY_PORT)
    private readonly characterRepository: CharacterRepositoryPort,
  ) {}

  async execute(
    command: SyncCharacterRevisionCommand,
  ): Promise<CharacterResult> {
    const character = await loadOwnedCharacter(
      this.characterRepository,
      command.characterId,
      command.requesterId,
    )
    const revisionId = new CharacterRevisionId(command.revisionId)
    const revision = character.findRevision(revisionId)

    if (!revision) throw new NotFoundException('角色版本不存在')
    if (!revision.isDraft) {
      throw new ConflictException('已发布的角色版本不能更改')
    }

    const content = toCharacterRevisionContent(command.revision)
    character.replaceDraftRevision(revisionId, content)

    await this.characterRepository.save(character)
    return toCharacterResult(character)
  }
}
