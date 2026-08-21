export const CHARACTER_LIST_READ_PORT = Symbol('CHARACTER_LIST_READ_PORT')

export interface CharacterListItem {
	id: string
	ownerId: string
	alias: string | null
	currentRevisionId: string | null
	draftRevisionId: string | null
	name: string
	description: string
	createdAt: Date
	updatedAt: Date
}

export interface FindMyCharactersInput {
	ownerId: string
	offset: number
	limit: number
}

export interface CharacterListReadPort {
	findMyCharacters(input: FindMyCharactersInput): Promise<{
		items: CharacterListItem[]
		total: number
	}>
}
