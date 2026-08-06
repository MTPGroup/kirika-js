import type { CharacterCardV2 } from '../validators'
import { extractChunks } from './png-chunk-extractor'

export function parsePngCharacterCard(buffer: Uint8Array): CharacterCardV2 {
	const chunks = extractChunks(buffer)
	const decoder = new TextDecoder('utf-8')

	for (const chunk of chunks) {
		if (chunk.name === 'tEXt') {
			const nullIndex = chunk.data.indexOf(0)
			if (nullIndex === -1) continue

			const keyword = decoder.decode(chunk.data.subarray(0, nullIndex))

			if (keyword === 'chara') {
				const base64Str = decoder.decode(chunk.data.subarray(nullIndex + 1))

				// 容错解决多字节 UTF-8 (中文/Emoji) 乱码问题
				const binaryStr = atob(base64Str)
				const bytes = Uint8Array.from(binaryStr, (m) => m.charCodeAt(0))
				const jsonStr = decoder.decode(bytes)

				const parsed = JSON.parse(jsonStr)

				// 针对 V1 (平铺结构) 自动升级为标准的 CCv2
				if (!parsed.spec && parsed.name) {
					return {
						spec: 'chara_card_v2',
						spec_version: '2.0',
						data: parsed,
					} as CharacterCardV2
				}

				return parsed as CharacterCardV2
			}
		}
	}

	throw new Error('No character card data (chara tEXt chunk) found in PNG.')
}
