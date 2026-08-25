import {
  LOREBOOK_REPOSITORY_PORT,
  LorebookEntry,
  LorebookEntryId,
  type LorebookRepositoryPort,
  LorebookRevisionId,
} from '@kirika-js/core/domain/lorebook'
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
import { SyncLorebookEntriesCommand } from './sync-lorebook-entries.command'

@CommandHandler(SyncLorebookEntriesCommand)
export class SyncLorebookEntriesHandler
  implements ICommandHandler<SyncLorebookEntriesCommand>
{
  constructor(
    @Inject(LOREBOOK_REPOSITORY_PORT)
    private readonly lorebookRepository: LorebookRepositoryPort,
  ) {}

  async execute(
    command: SyncLorebookEntriesCommand,
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
      throw new ConflictException('已发布的版本不能更改')
    }

    const currentEntryIds = new Set(
      revision.entries.map((entry) => entry.id.value),
    )
    const unknownEntryId = command.entries.find(
      (entry) => entry.id && !currentEntryIds.has(entry.id),
    )?.id

    if (unknownEntryId) {
      throw new BadRequestException(`条目 ${unknownEntryId} 不属于该草稿版本`)
    }

    const entries = command.entries.map((entry) =>
      entry.id
        ? LorebookEntry.reconstitute(
            new LorebookEntryId(entry.id),
            entry.keys,
            entry.title,
            entry.enabled,
            entry.content,
            entry.position,
            entry.priority,
          )
        : LorebookEntry.create(
            entry.keys,
            entry.title,
            entry.enabled,
            entry.content,
            entry.position,
            entry.priority,
          ),
    )

    lorebook.replaceRevisionEntries(revisionId, entries)
    await this.lorebookRepository.save(lorebook)

    return toLorebookRevisionResult(lorebook, revision)
  }
}
