import { Command } from '@nestjs/cqrs'
import type { CharacterResult } from '../character.result'

export class CreateCharacterRevisionCommand extends Command<CharacterResult> {
	constructor(
		readonly characterId: string,
		readonly requesterId: string,
	) {
		super()
	}
}
