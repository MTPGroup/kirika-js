import {
  LOREBOOK_REPOSITORY_PORT,
  LorebookId,
  type LorebookRepositoryPort,
} from '@kirika-js/domain/lorebook'
import {
  BadRequestException,
  ForbiddenException,
  Inject,
  NotFoundException,
} from '@nestjs/common'
import { CommandHandler, type ICommandHandler } from '@nestjs/cqrs'
import {
  UpdateLorebookCommand,
  type UpdateLorebookResult,
} from './update-lorebook.command'

@CommandHandler(UpdateLorebookCommand)
export class UpdateLorebookHandler
  implements ICommandHandler<UpdateLorebookCommand>
{
  constructor(
    @Inject(LOREBOOK_REPOSITORY_PORT)
    private readonly lorebookRepository: LorebookRepositoryPort,
  ) {}

  async execute(command: UpdateLorebookCommand): Promise<UpdateLorebookResult> {
    const lorebook = await this.lorebookRepository.findById(
      new LorebookId(command.id),
    )

    if (!lorebook) {
      throw new NotFoundException('世界书不存在')
    }

    if (lorebook.ownerId.value !== command.requesterId) {
      throw new ForbiddenException('无权更新该世界书')
    }

    if (command.name !== undefined || command.description !== undefined) {
      lorebook.updateMetadata(
        command.name ?? lorebook.name,
        command.description ?? lorebook.description,
      )
    }

    if (command.visibility !== undefined) {
      if (command.visibility !== 'private' && !lorebook.currentRevision) {
        throw new BadRequestException('没有已发布版本的世界书不能对外可见')
      }

      lorebook.changeVisibility(command.visibility)
    }

    await this.lorebookRepository.save(lorebook)

    return {
      id: lorebook.id.value,
      ownerId: lorebook.ownerId.value,
      name: lorebook.name,
      description: lorebook.description,
      visibility: lorebook.visibility,
      currentRevisionId: lorebook.currentRevision?.id.value ?? null,
      createdAt: lorebook.createdAt,
      updatedAt: lorebook.updatedAt,
    }
  }
}
