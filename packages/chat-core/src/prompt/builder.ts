import type { CharacterCardV2 } from '@kirika-js/character-spec'
import type { MessageTree } from '../memory/working/message-tree'
import { PromptBudgetAllocator } from './budget-allocator'
import type { FactItem, RAGDocument } from './context-source'
import { LorebookActivator } from './lorebook-activator'
import {
	type MacroContext,
	replaceMacroContent,
	replaceMacroString,
} from './macro-replacer'
import type { PromptPayload } from './payload'
import { SystemBlockFactory } from './system-block-factory'
import type { PromptTokenizer } from './tokenizer'

export interface BuildOptions {
	card: CharacterCardV2
	tree: MessageTree
	userName: string
	facts?: FactItem[]
	ragDocs?: RAGDocument[]
	defaultSystemPrompt?: string
	defaultPostHistoryInstructions?: string
	extraMacros?: Record<string, string>
	maxContentTokens: number
	reserveResponseTokens: number
	historyBudgetRatio?: number
}

export class PromptBuilder {
	private blockFactory: SystemBlockFactory
	private budgetAllocator: PromptBudgetAllocator

	constructor(tokenizer: PromptTokenizer) {
		this.blockFactory = new SystemBlockFactory(new LorebookActivator(tokenizer))
		this.budgetAllocator = new PromptBudgetAllocator(tokenizer)
	}

	build(options: BuildOptions): PromptPayload {
		validateBuildOptions(options)

		const cardData = options.card.data
		const macroContext: MacroContext = {
			charName: cardData.name,
			userName: options.userName,
			extraMacros: options.extraMacros,
		}
		const messages = options.tree.getActivePath().map((node) => ({
			role: node.role,
			content: replaceMacroContent(node.content, macroContext),
		}))
		const systemPrompt = resolvePromptOverride(
			cardData.system_prompt,
			options.defaultSystemPrompt,
			macroContext,
		)
		const blocks = this.blockFactory.create({
			cardData,
			messages,
			macroContext,
			systemPrompt,
			facts: options.facts,
			ragDocs: options.ragDocs,
		})
		const postHistoryInstructions = resolvePromptOverride(
			cardData.post_history_instructions,
			options.defaultPostHistoryInstructions,
			macroContext,
		)

		return this.budgetAllocator.allocate({
			blocks,
			messages,
			postHistoryInstructions,
			availableTokens: options.maxContentTokens - options.reserveResponseTokens,
			historyBudgetRatio: options.historyBudgetRatio ?? 0.5,
		})
	}
}

function validateBuildOptions(options: BuildOptions): void {
	if (options.maxContentTokens <= 0) {
		throw new Error('maxContentTokens must be greater than 0')
	}

	if (
		options.reserveResponseTokens < 0 ||
		options.reserveResponseTokens >= options.maxContentTokens
	) {
		throw new Error('reserveResponseTokens is outside the valid range')
	}

	const historyBudgetRatio = options.historyBudgetRatio ?? 0.5
	if (historyBudgetRatio < 0 || historyBudgetRatio > 1) {
		throw new Error('historyBudgetRatio must be between 0 and 1')
	}
}

function resolvePromptOverride(
	cardValue: string,
	fallback: string | undefined,
	macroContext: MacroContext,
): string {
	const resolvedFallback = replaceMacroString(fallback ?? '', macroContext)
	const source = cardValue || fallback || ''

	return replaceMacroString(source, {
		...macroContext,
		extraMacros: {
			...macroContext.extraMacros,
			original: resolvedFallback,
		},
	})
}
