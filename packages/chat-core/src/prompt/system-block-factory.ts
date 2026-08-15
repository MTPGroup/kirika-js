import type { CharacterCardV2 } from '@kirika-js/character-spec'
import type { ChatMessage } from '../conversation/chat-message'
import { type PromptBlock, SECTION } from './block'
import type { FactItem, RAGDocument } from './context-source'
import type { LorebookActivator } from './lorebook-activator'
import { type MacroContext, replaceMacroString } from './macro-replacer'

interface CreateSystemBlocksOptions {
	cardData: CharacterCardV2['data']
	messages: ChatMessage[]
	macroContext: MacroContext
	systemPrompt: string
	facts?: FactItem[]
	ragDocs?: RAGDocument[]
}

export class SystemBlockFactory {
	constructor(private lorebookActivator: LorebookActivator) {}

	create(options: CreateSystemBlocksOptions): PromptBlock[] {
		const { cardData, messages, macroContext, systemPrompt, facts, ragDocs } =
			options
		const blocks: PromptBlock[] = []

		if (systemPrompt) {
			blocks.push({
				id: 'system-prompt',
				content: systemPrompt,
				priority: 100,
				required: true,
				section: SECTION.system,
			})
		}

		blocks.push(
			...this.lorebookActivator.activate(
				cardData.character_book,
				messages,
				macroContext,
			),
		)

		if (cardData.description) {
			blocks.push({
				id: 'description',
				content: `[Character Description]:\n${replaceMacroString(cardData.description, macroContext)}`,
				priority: 100,
				required: true,
				section: SECTION.description,
			})
		}

		if (cardData.personality) {
			blocks.push({
				id: 'personality',
				content: `[Personality: ${replaceMacroString(cardData.personality, macroContext)}]`,
				priority: 90,
				required: false,
				section: SECTION.personality,
			})
		}

		if (cardData.scenario) {
			blocks.push({
				id: 'scenario',
				content: `[Scenario: ${replaceMacroString(cardData.scenario, macroContext)}]`,
				priority: 80,
				required: false,
				section: SECTION.scenario,
			})
		}

		if (facts && facts.length > 0) {
			const content = facts
				.map((fact) => {
					return `- ${replaceMacroString(fact.key, macroContext)}: ${replaceMacroString(fact.value, macroContext)}`
				})
				.join('\n')
			blocks.push({
				id: 'facts',
				content: `[Known Facts about Environment/User]:\n${content}`,
				priority: 70,
				required: false,
				section: SECTION.facts,
			})
		}

		if (ragDocs && ragDocs.length > 0) {
			const content = ragDocs
				.map((document) => {
					return `- ${replaceMacroString(document.content, macroContext)}`
				})
				.join('\n')
			blocks.push({
				id: 'rag',
				content: `[Retrieved Context/Memories]:\n${content}`,
				priority: 50,
				required: false,
				section: SECTION.rag,
			})
		}

		if (cardData.mes_example) {
			blocks.push({
				id: 'examples',
				content: `[Example Dialogues]:\n${replaceMacroString(cardData.mes_example, macroContext)}`,
				priority: 20,
				required: false,
				section: SECTION.examples,
			})
		}

		return blocks
	}
}
