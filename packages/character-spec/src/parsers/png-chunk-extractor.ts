import { crc32 } from 'crc'

export interface PngChunk {
	name: string
	data: Uint8Array
}
/**
 * 从 PNG 格式的二进制 Buffer 中解析并提取所有的 PNG Chunk 块。
 *
 * @param buffer - 完整的 PNG 图片文件二进制数据 (Uint8Array)
 * @returns 解析得到的 PNG 块对象数组
 *
 * @throws {Error} 当 PNG 魔数头不匹配、缺少 IHDR 头、CRC32 校验失败或文件非正常截断时抛出异常
 *
 * @copyright Based on png-chunks-extract by Hugh Kennedy (MIT License)
 * @see {@link https://github.com/hughsk/png-chunks-extract}
 *
 * License Notice:
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software.
 */
export function extractChunks(buffer: Uint8Array): PngChunk[] {
	const uint8 = new Uint8Array(4)
	const int32 = new Int32Array(uint8.buffer)
	const uint32 = new Uint32Array(uint8.buffer)

	if (
		buffer[0] !== 0x89 ||
		buffer[1] !== 0x50 ||
		buffer[2] !== 0x4e ||
		buffer[3] !== 0x47 ||
		buffer[4] !== 0x0d ||
		buffer[5] !== 0x0a ||
		buffer[6] !== 0x1a ||
		buffer[7] !== 0x0a
	) {
		throw new Error('Invalid .png file header')
	}

	let ended = false
	const chunks: PngChunk[] = []
	let idx = 8

	while (idx < buffer.length) {
		uint8[3] = buffer[idx++]
		uint8[2] = buffer[idx++]
		uint8[1] = buffer[idx++]
		uint8[0] = buffer[idx++]

		const dataLength = uint32[0]
		const length = dataLength + 4
		const chunk = new Uint8Array(length)

		chunk[0] = buffer[idx++]
		chunk[1] = buffer[idx++]
		chunk[2] = buffer[idx++]
		chunk[3] = buffer[idx++]

		const name =
			String.fromCharCode(chunk[0]) +
			String.fromCharCode(chunk[1]) +
			String.fromCharCode(chunk[2]) +
			String.fromCharCode(chunk[3])

		if (chunks.length === 0 && name !== 'IHDR') {
			throw new Error('IHDR header missing')
		}

		if (name === 'IEND') {
			ended = true
			chunks.push({ name, data: new Uint8Array(0) })
			break
		}

		for (let i = 4; i < length; i++) {
			chunk[i] = buffer[idx++]
		}

		uint8[3] = buffer[idx++]
		uint8[2] = buffer[idx++]
		uint8[1] = buffer[idx++]
		uint8[0] = buffer[idx++]

		const crcActual = int32[0]
		const crcExpect = crc32(chunk) | 0

		if (crcExpect !== crcActual) {
			throw new Error(`CRC values for ${name} header do not match`)
		}

		chunks.push({
			name,
			data: chunk.subarray(4),
		})
	}

	if (!ended) {
		throw new Error('.png file ended prematurely: no IEND header was found')
	}

	return chunks
}
