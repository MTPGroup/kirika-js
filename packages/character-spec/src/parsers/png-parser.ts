import type { CharacterCardV2 } from '../validators'
import { parseJsonCharacterCard } from './json-parser'
import {
	extractChunks,
	type PngChunkExtractionOptions,
} from './png-chunk-extractor'

export interface PngCharacterCardParseOptions
	extends PngChunkExtractionOptions {
	maxCharacterDataBytes?: number
}

const DEFAULT_MAX_CHARACTER_DATA_BYTES = 4 * 1024 * 1024

export function parsePngCharacterCard(
	buffer: Uint8Array,
	options: PngCharacterCardParseOptions = {},
): CharacterCardV2 {
	const maxCharacterDataBytes =
		options.maxCharacterDataBytes ?? DEFAULT_MAX_CHARACTER_DATA_BYTES
	if (
		!Number.isSafeInteger(maxCharacterDataBytes) ||
		maxCharacterDataBytes <= 0
	) {
		throw new Error('maxCharacterDataBytes must be a positive safe integer')
	}

	const chunks = extractChunks(buffer, options)
	const decoder = new TextDecoder('utf-8', { fatal: true })
	let characterData: Uint8Array | undefined

	for (const chunk of chunks) {
		if (chunk.name === 'tEXt') {
			const nullIndex = chunk.data.indexOf(0)
			if (nullIndex === -1) continue

			const keyword = decoder.decode(chunk.data.subarray(0, nullIndex))

			if (keyword === 'chara') {
				if (characterData) {
					throw new Error('PNG contains multiple character card data chunks')
				}
				characterData = chunk.data.subarray(nullIndex + 1)
			}
		}
	}

	if (!characterData) {
		throw new Error('No character card data (chara tEXt chunk) found in PNG.')
	}
	if (characterData.length > maxCharacterDataBytes) {
		throw new Error(
			`Character card data exceeds size limit of ${maxCharacterDataBytes} bytes`,
		)
	}

	const base64Str = decoder.decode(characterData)
	const binaryStr = atob(base64Str)
	const bytes = Uint8Array.from(binaryStr, (value) => value.charCodeAt(0))
	const jsonStr = decoder.decode(bytes)
	return parseJsonCharacterCard(jsonStr)
}
