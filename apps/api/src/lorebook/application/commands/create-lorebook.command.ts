import { Command } from '@nestjs/cqrs'

export interface CreateLorebookResult {
	id: string
	ownerId: string
	name: string
	description: string
	draftRevisionId: string
	currentRevisionId: string | null
	createdAt: Date
	updatedAt: Date
}

export class CreateLorebookCommand extends Command<CreateLorebookResult> {
	constructor(
		readonly name: string,
		readonly description: string,
		readonly ownerId: string,
	) {
		super()
	}
}
