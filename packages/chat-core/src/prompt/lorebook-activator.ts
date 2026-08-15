import type {
	CharacterBookEntry,
	CharacterCardV2,
} from '@kirika-js/character-spec'
import type { ChatMessage } from '../conversation/chat-message'
import { type PromptBlock, SECTION } from './block'
import { type MacroContext, replaceMacroString } from './macro-replacer'
import type { PromptTokenizer } from './tokenizer'

interface ActivatedLoreEntry {
	entry: CharacterBookEntry
	content: string
	keys: string[]
	index: number
}

type CharacterBook = CharacterCardV2['data']['character_book']

export class LorebookActivator {
	constructor(private tokenizer: PromptTokenizer) {}

	activate(
		book: CharacterBook,
		messages: ChatMessage[],
		macroContext: MacroContext,
	): PromptBlock[] {
		if (!book) return []

		const scanDepth =
			book.scan_depth === undefined
				? messages.length
				: Math.max(0, Math.floor(book.scan_depth))
		let scanText = messages
			.slice(Math.max(0, messages.length - scanDepth))
			.map(messageContentToText)
			.join('\n')
		const activated: ActivatedLoreEntry[] = []
		const activatedIndexes = new Set<number>()

		do {
			let changed = false

			for (const [index, entry] of book.entries.entries()) {
				if (!entry.enabled || activatedIndexes.has(index)) continue

				const primaryKeys = findMatchingKeys(
					entry.keys,
					scanText,
					entry.case_sensitive ?? false,
				)
				const secondaryKeys = findMatchingKeys(
					entry.secondary_keys ?? [],
					scanText,
					entry.case_sensitive ?? false,
				)
				const matches =
					entry.constant === true ||
					(primaryKeys.length > 0 &&
						(!entry.selective || secondaryKeys.length > 0))

				if (!matches) continue

				const content = replaceMacroString(entry.content, macroContext)
				activated.push({
					entry,
					content: `[Character Lore]:\n${content}`,
					keys:
						primaryKeys.length > 0
							? [...primaryKeys, ...secondaryKeys]
							: entry.keys,
					index,
				})
				activatedIndexes.add(index)
				changed = true

				if (book.recursive_scanning) {
					scanText += `\n${content}`
				}
			}

			if (!book.recursive_scanning || !changed) break
		} while (activatedIndexes.size < book.entries.length)

		return this.applyTokenBudget(activated, book.token_budget).map(
			({ entry, content, keys, index }) => ({
				id: `character-lore-${entry.id ?? index}`,
				content,
				priority: 85,
				secondaryPriority: entry.priority ?? 0,
				required: false,
				section:
					entry.position === 'before_char'
						? SECTION.loreBeforeCharacter
						: SECTION.loreAfterCharacter,
				order: entry.insertion_order,
				activatedLorebookKeys: keys,
			}),
		)
	}

	private applyTokenBudget(
		entries: ActivatedLoreEntry[],
		budget: number | undefined,
	): ActivatedLoreEntry[] {
		if (budget === undefined) return entries

		const availableTokens = Math.max(0, Math.floor(budget))
		const selected: ActivatedLoreEntry[] = []
		const candidates = [...entries].sort(compareLorePriority)

		for (const candidate of candidates) {
			const candidateText = [...selected, candidate]
				.sort(compareLoreOrder)
				.map((entry) => entry.content)
				.join('\n\n')

			if (
				this.tokenizer.estimateContentTokens(candidateText) <= availableTokens
			) {
				selected.push(candidate)
			}
		}

		return selected
	}
}

function findMatchingKeys(
	keys: string[],
	text: string,
	caseSensitive: boolean,
): string[] {
	const haystack = caseSensitive ? text : text.toLocaleLowerCase()

	return keys.filter((key) => {
		if (!key) return false
		const needle = caseSensitive ? key : key.toLocaleLowerCase()
		return haystack.includes(needle)
	})
}

function messageContentToText(message: ChatMessage): string {
	if (typeof message.content === 'string') return message.content

	return message.content
		.filter((part) => part.type === 'text')
		.map((part) => (part.type === 'text' ? part.text : ''))
		.join('\n')
}

function compareLorePriority(
	a: ActivatedLoreEntry,
	b: ActivatedLoreEntry,
): number {
	return (
		(b.entry.priority ?? 0) - (a.entry.priority ?? 0) ||
		a.entry.insertion_order - b.entry.insertion_order ||
		a.index - b.index
	)
}

function compareLoreOrder(
	a: ActivatedLoreEntry,
	b: ActivatedLoreEntry,
): number {
	return a.entry.insertion_order - b.entry.insertion_order || a.index - b.index
}
