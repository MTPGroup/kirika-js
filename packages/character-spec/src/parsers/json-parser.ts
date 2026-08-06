import {
	type CharacterCardV2,
	CharacterCardV2Schema,
	type TavernCardV1,
	TavernCardV1Schema,
} from '../validators'

function upgradeV1Card(card: TavernCardV1): CharacterCardV2 {
	return {
		spec: 'chara_card_v2',
		spec_version: '2.0',
		data: {
			...card,
			creator_notes: '',
			system_prompt: '',
			post_history_instructions: '',
			alternate_greetings: [],
			tags: [],
			creator: '',
			character_version: '',
			extensions: {},
		},
	}
}

/**
 * 解析纯 JSON 格式（字符串或 Uint8Array 二进制）的角色卡数据。
 *
 * 严格校验 CCv2 JSON，同时将字段完整且类型正确的 TavernAI V1 转换为 CCv2。
 *
 * @param input - JSON 文本字符串，或者 UTF-8 编码的 Uint8Array 二进制 Buffer
 * @returns 经过严格校验并统一升级为 CCv2 的 CharacterCardV2 对象
 *
 * @throws {Error} 当 JSON 语法错误或数据不符合角色卡 Schema 结构时抛出异常
 */
export function parseJsonCharacterCard(
	input: string | Uint8Array,
): CharacterCardV2 {
	let jsonString: string

	if (typeof input === 'string') {
		jsonString = input
	} else if (input instanceof Uint8Array) {
		const decoder = new TextDecoder('utf-8', { fatal: true })
		jsonString = decoder.decode(input)
	} else {
		throw new Error('Invalid input: Expected string or Uint8Array')
	}

	let rawJson: unknown
	try {
		rawJson = JSON.parse(jsonString)
	} catch (err) {
		throw new Error(`Failed to parse JSON string: ${(err as Error).message}`)
	}

	if (
		typeof rawJson !== 'object' ||
		rawJson === null ||
		Array.isArray(rawJson)
	) {
		throw new Error('Invalid character card format: Root must be an object')
	}

	const record = rawJson as Record<string, unknown>
	if (!('spec' in record)) {
		return upgradeV1Card(TavernCardV1Schema.parse(record))
	}

	return CharacterCardV2Schema.parse(record)
}
