export interface ChatMacroContext {
	readonly characterName: string
	readonly userName: string
	readonly speakerName: string
	readonly original?: string
	readonly extra?: Readonly<Record<string, string>>
}

const BUILT_IN_MACROS = new Set([
	'char',
	'character',
	'user',
	'speaker',
	'original',
])

export function replaceChatMacros(
	value: string,
	context: ChatMacroContext,
): string {
	return value.replace(
		/\{\{\s*([\w.-]+)\s*\}\}/giu,
		(source, rawName: string) => {
			const name = rawName.toLocaleLowerCase()
			switch (name) {
				case 'char':
				case 'character':
					return context.characterName
				case 'user':
					return context.userName
				case 'speaker':
					return context.speakerName
				case 'original':
					return context.original ?? ''
				default:
					return context.extra?.[name] ?? source
			}
		},
	)
}

export function normalizeExtraMacros(
	macros: Readonly<Record<string, string>> | undefined,
): Readonly<Record<string, string>> {
	const normalized: Record<string, string> = {}
	for (const [rawName, value] of Object.entries(macros ?? {})) {
		const name = rawName.trim().toLocaleLowerCase()
		if (!name) throw new Error('自定义宏名称不能为空')
		if (BUILT_IN_MACROS.has(name)) {
			throw new Error(`自定义宏不能覆盖内置宏: ${name}`)
		}
		normalized[name] = value
	}
	return normalized
}
