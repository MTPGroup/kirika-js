import { type CharacterCardV2, CharacterCardV2Schema } from '../validators'

/**
 * 解析纯 JSON 格式（字符串或 Uint8Array 二进制）的角色卡数据。
 *
 * 支持直接解析符合 CCv2 规范的 JSON，同时会自动将旧版 TavernAI V1 格式转换为 CCv2 结构。
 *
 * @param input - JSON 文本字符串，或者 UTF-8 编码的 Uint8Array 二进制 Buffer
 * @returns 经过 Zod 校验并规范化后的 CharacterCardV2 对象
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
		const decoder = new TextDecoder('utf-8')
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

	if (typeof rawJson !== 'object' || rawJson === null) {
		throw new Error('Invalid character card format: Root must be an object')
	}

	const record = rawJson as Record<string, unknown>

	const normalizedJson =
		!record.spec && typeof record.name === 'string'
			? {
					spec: 'chara_card_v2',
					spec_version: '2.0',
					data: record,
				}
			: record

	return CharacterCardV2Schema.parse(normalizedJson)
}
