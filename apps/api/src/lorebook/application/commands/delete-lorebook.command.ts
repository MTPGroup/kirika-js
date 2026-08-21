import { Command } from '@nestjs/cqrs'

export class DeleteLorebookCommand extends Command<void> {
	constructor(
		readonly id: string,
		readonly requesterId: string,
	) {
		super()
	}
}
