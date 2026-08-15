export interface PromptBlock {
	id: string
	content: string
	priority: number
	required: boolean
	section: number
	order?: number
	secondaryPriority?: number
	activatedLorebookKeys?: string[]
}

export const SECTION = {
	system: 0,
	loreBeforeCharacter: 10,
	description: 20,
	personality: 30,
	scenario: 40,
	loreAfterCharacter: 50,
	facts: 60,
	rag: 70,
	examples: 80,
} as const

export function renderBlocks(blocks: PromptBlock[]): string {
	return [...blocks]
		.sort((a, b) => {
			return (
				(a.section ?? 0) - (b.section ?? 0) || (a.order ?? 0) - (b.order ?? 0)
			)
		})
		.map((block) => block.content)
		.filter(Boolean)
		.join('\n\n')
}
