import {
  LOREBOOK_REPOSITORY_PORT,
  type LorebookRepositoryPort,
} from '@kirika-js/core/domain/lorebook'
import { Inject } from '@nestjs/common'
import { CommandHandler, type ICommandHandler } from '@nestjs/cqrs'
import { loadOwnedLorebook } from '../services/load-owned-lorebook'
import { DeleteLorebookCommand } from './delete-lorebook.command'

@CommandHandler(DeleteLorebookCommand)
export class DeleteLorebookHandler
  implements ICommandHandler<DeleteLorebookCommand>
{
  constructor(
    @Inject(LOREBOOK_REPOSITORY_PORT)
    private readonly lorebookRepository: LorebookRepositoryPort,
  ) {}

  async execute(command: DeleteLorebookCommand): Promise<void> {
    const lorebook = await loadOwnedLorebook(
      this.lorebookRepository,
      command.id,
      command.requesterId,
    )

    await this.lorebookRepository.delete(lorebook.id)
  }
}
