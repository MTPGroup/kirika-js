import { Command } from '@nestjs/cqrs'
import type { CharacterResult } from '../character.result'
import type { CharacterRevisionInput } from '../character-revision.input'

export class CreateCharacterCommand extends Command<CharacterResult> {
	constructor(
		readonly ownerId: string,
		readonly alias: string | null,
		readonly revision: CharacterRevisionInput,
	) {
		super()
	}
}
