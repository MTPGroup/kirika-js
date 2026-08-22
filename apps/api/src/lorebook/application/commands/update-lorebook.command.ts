import type { LorebookVisibility } from '@kirika-js/domain/lorebook'
import { Command } from '@nestjs/cqrs'

export interface UpdateLorebookResult {
  id: string
  ownerId: string
  name: string
  description: string
  visibility: LorebookVisibility
  currentRevisionId: string | null
  createdAt: Date
  updatedAt: Date
}

export class UpdateLorebookCommand extends Command<UpdateLorebookResult> {
  constructor(
    readonly id: string,
    readonly requesterId: string,
    readonly name?: string,
    readonly description?: string,
    readonly visibility?: LorebookVisibility,
  ) {
    super()
  }
}
