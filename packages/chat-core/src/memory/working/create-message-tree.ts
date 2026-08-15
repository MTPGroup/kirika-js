import type { CharacterCardV2 } from '@kirika-js/character-spec'
import { replaceMacroString } from '../../prompt/macro-replacer'
import { MessageTree } from './message-tree'

export interface CreateMessageTreeOptions {
	userName: string
	greetingIndex?: number
	extraMacros?: Record<string, string>
}

/**
 * 使用角色卡问候语创建消息树。索引 0 表示 first_mes，后续索引对应
 * alternate_greetings，便于前端实现首条消息的 swipe。
 */
export function createMessageTreeFromCard(
	card: CharacterCardV2,
	opts: CreateMessageTreeOptions,
): MessageTree {
	const greetings = [card.data.first_mes, ...card.data.alternate_greetings]
	const greetingIndex = opts.greetingIndex ?? 0

	if (
		!Number.isInteger(greetingIndex) ||
		greetingIndex < 0 ||
		greetingIndex >= greetings.length
	) {
		throw new RangeError(
			`Greeting index is outside the valid range: ${greetingIndex}`,
		)
	}

	const tree = new MessageTree()
	const greeting = greetings[greetingIndex]

	if (greeting) {
		tree.addNode(
			'assistant',
			replaceMacroString(greeting, {
				charName: card.data.name,
				userName: opts.userName,
				extraMacros: opts.extraMacros,
			}),
		)
	}

	return tree
}
