export interface FactItem {
	key: string
	value: string
	category?: 'user' | 'char' | 'relation' | 'world'
}

export interface RAGDocument {
	id: string
	content: string
	score?: number
	source?: string
}
