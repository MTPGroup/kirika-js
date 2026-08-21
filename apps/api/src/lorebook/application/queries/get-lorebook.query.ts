import type {
	LorebookVisibility,
	LoreEntryPosition,
} from '@kirika-js/domain/lorebook'
import { Query } from '@nestjs/cqrs'

export interface LorebookEntryResult {
	id: string
	keys: string[]
	title: string
	enabled: boolean
	content: string
	position: LoreEntryPosition
	priority: number
}

export interface LorebookRevisionResult {
	id: string
	revisionNumber: number
	isDraft: boolean
	entries: LorebookEntryResult[]
}

export interface GetLorebookResult {
	id: string
	ownerId: string
	name: string
	description: string
	visibility: LorebookVisibility
	currentRevisionId: string | null
	draftRevisionId: string | null
	revisions: LorebookRevisionResult[]
	createdAt: Date
	updatedAt: Date
}

export class GetLorebookQuery extends Query<GetLorebookResult> {
	constructor(
		readonly id: string,
		readonly requesterId: string,
	) {
		super()
	}
}
