import { Command } from '@nestjs/cqrs'
import type { LoreEntryPosition } from '~/lorebook/domain/entities/lorebook-entry.entity'
import type { LorebookRevisionResult } from '../lorebook-revision.result'

export interface SyncLorebookEntryInput {
	id?: string
	keys: string[]
	title: string
	enabled: boolean
	content: string
	position: LoreEntryPosition
	priority: number
}

export class SyncLorebookEntriesCommand extends Command<LorebookRevisionResult> {
	constructor(
		readonly lorebookId: string,
		readonly revisionId: string,
		readonly requesterId: string,
		readonly entries: SyncLorebookEntryInput[],
	) {
		super()
	}
}
