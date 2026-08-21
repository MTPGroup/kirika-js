import { Command } from '@nestjs/cqrs'
import type { LorebookVisibility } from '~/lorebook/domain/entities/lorebook.entity'

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
