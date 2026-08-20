import { LorebookVisibility } from '~/lorebook/domain/entities/lorebook.entity'

export const LOREBOOK_LIST_READ_PORT = Symbol('LOREBOOK_LIST_READ_PORT')

export interface LorebookListItem {
	id: string
	ownerId: string
	name: string
	description: string
	currentRevisionId: string | null
	visibility: LorebookVisibility
	createdAt: Date
	updatedAt: Date
}

export interface FindMyLorebooksInput {
	ownerId: string
	offset: number
	limit: number
	visibility?: LorebookVisibility
}

export interface LorebookListReadPort {
	findMyLorebooks(input: FindMyLorebooksInput): Promise<{
		items: LorebookListItem[]
		total: number
	}>
}
