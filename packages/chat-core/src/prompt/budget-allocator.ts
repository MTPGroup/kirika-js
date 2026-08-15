import type { ChatMessage } from '../conversation/chat-message'
import { type PromptBlock, renderBlocks } from './block'
import type { PromptPayload } from './payload'
import type { PromptTokenizer } from './tokenizer'

interface AllocatePromptOptions {
	blocks: PromptBlock[]
	messages: ChatMessage[]
	postHistoryInstructions: string
	availableTokens: number
	historyBudgetRatio: number
}

export class PromptBudgetAllocator {
	constructor(private tokenizer: PromptTokenizer) {}

	allocate(options: AllocatePromptOptions): PromptPayload {
		const {
			blocks,
			messages,
			postHistoryInstructions,
			availableTokens,
			historyBudgetRatio,
		} = options
		const requiredBlocks = blocks.filter((block) => block.required)
		const optionalBlocks = blocks
			.filter((block) => !block.required)
			.sort(compareOptionalBlockPriority)
		const requiredSystemPrompt = renderBlocks(requiredBlocks)
		const requiredInstructionTokens = this.estimatePrompt(
			requiredSystemPrompt,
			[],
			postHistoryInstructions,
		)

		if (requiredInstructionTokens > availableTokens) {
			throw new Error(
				`Required character instructions exceed token budget: ` +
					`${requiredInstructionTokens}/${availableTokens}`,
			)
		}

		const mandatoryStart = findMandatoryHistoryStart(messages)
		const mandatoryMessages = messages.slice(mandatoryStart)
		const requiredTokens = this.estimatePrompt(
			requiredSystemPrompt,
			mandatoryMessages,
			postHistoryInstructions,
		)

		if (requiredTokens > availableTokens) {
			throw new Error(
				`Required prompt and latest conversational turn exceed token budget: ` +
					`${requiredTokens}/${availableTokens}`,
			)
		}

		const olderMessages = messages.slice(0, mandatoryStart)
		const remainingAfterRequired = availableTokens - requiredTokens
		const reservedOlderHistoryTokens = Math.min(
			this.estimateMessages(olderMessages),
			Math.floor(remainingAfterRequired * historyBudgetRatio),
		)
		const selectedOptionalBlocks = this.selectOptionalBlocks(
			requiredBlocks,
			optionalBlocks,
			mandatoryMessages,
			postHistoryInstructions,
			reservedOlderHistoryTokens,
			availableTokens,
		)
		const selectedBlocks = [...requiredBlocks, ...selectedOptionalBlocks]
		const systemPrompt = renderBlocks(selectedBlocks)
		const selectedMessages = this.truncateHistory(
			messages,
			mandatoryStart,
			systemPrompt,
			postHistoryInstructions,
			availableTokens,
		)
		const estimatedTokens = this.estimatePrompt(
			systemPrompt,
			selectedMessages,
			postHistoryInstructions,
		)

		if (estimatedTokens > availableTokens) {
			throw new Error(
				`PromptBuilder produced a prompt outside the token budget: ` +
					`${estimatedTokens}/${availableTokens}`,
			)
		}

		return {
			systemPrompt,
			messages: selectedMessages,
			postHistoryInstructions,
			activatedLorebookKeys: collectActivatedLorebookKeys(selectedBlocks),
			estimatedTokens,
		}
	}

	private selectOptionalBlocks(
		requiredBlocks: PromptBlock[],
		optionalBlocks: PromptBlock[],
		mandatoryMessages: ChatMessage[],
		postHistoryInstructions: string,
		reservedOlderHistoryTokens: number,
		availableTokens: number,
	): PromptBlock[] {
		const selected: PromptBlock[] = []

		for (const block of optionalBlocks) {
			const candidateSystemPrompt = renderBlocks([
				...requiredBlocks,
				...selected,
				block,
			])
			const candidateTokens =
				this.estimatePrompt(
					candidateSystemPrompt,
					mandatoryMessages,
					postHistoryInstructions,
				) + reservedOlderHistoryTokens

			if (candidateTokens <= availableTokens) {
				selected.push(block)
			}
		}

		return selected
	}

	private truncateHistory(
		messages: ChatMessage[],
		mandatoryStart: number,
		systemPrompt: string,
		postHistoryInstructions: string,
		availableTokens: number,
	): ChatMessage[] {
		const selected = messages.slice(mandatoryStart)

		for (let index = mandatoryStart - 1; index >= 0; index--) {
			const candidateMessages = [messages[index], ...selected]
			const candidateTokens = this.estimatePrompt(
				systemPrompt,
				candidateMessages,
				postHistoryInstructions,
			)

			if (candidateTokens > availableTokens) break

			selected.unshift(messages[index])
		}

		return selected
	}

	private estimateMessages(messages: ChatMessage[]): number {
		return messages.reduce(
			(tokens, message) =>
				tokens + this.tokenizer.estimateMessageTokens(message),
			0,
		)
	}

	private estimatePrompt(
		systemPrompt: string,
		messages: ChatMessage[],
		postHistoryInstructions: string,
	): number {
		return this.tokenizer.estimatePromptTokens({
			systemPrompt,
			messages,
			postHistoryInstructions,
		}).totalInputTokens
	}
}

function compareOptionalBlockPriority(a: PromptBlock, b: PromptBlock): number {
	return (
		b.priority - a.priority ||
		(b.secondaryPriority ?? 0) - (a.secondaryPriority ?? 0) ||
		a.section - b.section ||
		(a.order ?? 0) - (b.order ?? 0)
	)
}

function findMandatoryHistoryStart(messages: ChatMessage[]): number {
	for (let index = messages.length - 1; index >= 0; index--) {
		if (messages[index].role === 'user') return index
	}

	return Math.max(0, messages.length - 1)
}

function collectActivatedLorebookKeys(blocks: PromptBlock[]): string[] {
	return [
		...new Set(blocks.flatMap((block) => block.activatedLorebookKeys ?? [])),
	]
}
