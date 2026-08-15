import type { MessageContent } from '../conversation/chat-message'

export interface MacroContext {
	charName: string
	userName: string
	extraMacros?: Record<string, string>
}

export function replaceMacroString(text: string, ctx: MacroContext): string {
	let result = text
		.replaceAll('{{char}}', ctx.charName)
		.replaceAll('{{user}}', ctx.userName)

	if (ctx.extraMacros) {
		for (const [key, value] of Object.entries(ctx.extraMacros)) {
			result = result.replaceAll(`{{${key}}}`, value)
		}
	}

	return result
}

export function replaceMacroContent(
	content: MessageContent,
	ctx: MacroContext,
): MessageContent {
	if (typeof content === 'string') {
		return replaceMacroString(content, ctx)
	}

	return content.map((part) => {
		if (part.type === 'text') {
			return { ...part, text: replaceMacroString(part.text, ctx) }
		}

		return part
	})
}
