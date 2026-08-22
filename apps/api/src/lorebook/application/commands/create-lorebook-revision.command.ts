import { Command } from '@nestjs/cqrs'
import type { LorebookRevisionResult } from '../lorebook-revision.result'

export class CreateLorebookRevisionCommand extends Command<LorebookRevisionResult> {
  constructor(
    readonly lorebookId: string,
    readonly requesterId: string,
  ) {
    super()
  }
}
