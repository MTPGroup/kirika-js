import { Command } from '@nestjs/cqrs'
import type { LorebookRevisionResult } from '../lorebook-revision.result'

export class PublishLorebookRevisionCommand extends Command<LorebookRevisionResult> {
  constructor(
    readonly lorebookId: string,
    readonly revisionId: string,
    readonly requesterId: string,
  ) {
    super()
  }
}
