import {
  LOREBOOK_REPOSITORY_PORT,
  type LorebookRepositoryPort,
  LorebookRevisionId,
} from '@kirika-js/domain/lorebook'
import {
  BadRequestException,
  ConflictException,
  Inject,
  NotFoundException,
} from '@nestjs/common'
import { CommandHandler, type ICommandHandler } from '@nestjs/cqrs'
import {
  type LorebookRevisionResult,
  toLorebookRevisionResult,
} from '../lorebook-revision.result'
import { loadOwnedLorebook } from '../services/load-owned-lorebook'
import { PublishLorebookRevisionCommand } from './publish-lorebook-revision.command'

@CommandHandler(PublishLorebookRevisionCommand)
export class PublishLorebookRevisionHandler
  implements ICommandHandler<PublishLorebookRevisionCommand>
{
  constructor(
    @Inject(LOREBOOK_REPOSITORY_PORT)
    private readonly lorebookRepository: LorebookRepositoryPort,
  ) {}

  async execute(
    command: PublishLorebookRevisionCommand,
  ): Promise<LorebookRevisionResult> {
    const lorebook = await loadOwnedLorebook(
      this.lorebookRepository,
      command.lorebookId,
      command.requesterId,
    )
    const revisionId = new LorebookRevisionId(command.revisionId)
    const revision = lorebook.findRevision(revisionId)

    if (!revision) {
      throw new NotFoundException('世界书版本不存在')
    }

    if (!revision.isDraft) {
      throw new ConflictException('只能发布草稿版本')
    }

    if (revision.entries.length === 0) {
      throw new BadRequestException('不能发布条目为空的世界书')
    }

    lorebook.publishRevision(revisionId)
    await this.lorebookRepository.save(lorebook)

    return toLorebookRevisionResult(lorebook, revision)
  }
}
