import crc32 from 'crc/calculators/crc32'

export interface PngChunk {
	name: string
	data: Uint8Array
}

export interface PngChunkExtractionOptions {
	maxFileBytes?: number
	maxChunkBytes?: number
}

const DEFAULT_MAX_FILE_BYTES = 20 * 1024 * 1024
const DEFAULT_MAX_CHUNK_BYTES = 10 * 1024 * 1024

function validatePositiveInteger(value: number, name: string): number {
	if (!Number.isSafeInteger(value) || value <= 0) {
		throw new Error(`${name} must be a positive safe integer`)
	}
	return value
}
/**
 * 从 PNG 格式的二进制 Buffer 中解析并提取所有的 PNG Chunk
 *
 * @param buffer - 完整的 PNG 图片文件二进制数据 (Uint8Array)
 * @param options - 文件与单个 Chunk 的大小限制
 * @returns 解析得到的 PNG 块对象数组
 * @throws {Error} 当文件头、Chunk 结构、CRC、大小或结束标记不合法时抛出
 *
 * @copyright Adapted from png-chunks-extract by Hugh Kennedy (MIT)
 * @see {@link https://github.com/hughsk/png-chunks-extract}
 */
export function extractChunks(
	buffer: Uint8Array,
	options: PngChunkExtractionOptions = {},
): PngChunk[] {
	const maxFileBytes = validatePositiveInteger(
		options.maxFileBytes ?? DEFAULT_MAX_FILE_BYTES,
		'maxFileBytes',
	)
	const maxChunkBytes = validatePositiveInteger(
		options.maxChunkBytes ?? DEFAULT_MAX_CHUNK_BYTES,
		'maxChunkBytes',
	)

	if (!(buffer instanceof Uint8Array)) {
		throw new Error('Invalid input: Expected Uint8Array')
	}
	if (buffer.length > maxFileBytes) {
		throw new Error(`PNG file exceeds size limit of ${maxFileBytes} bytes`)
	}

	if (
		buffer.length < 8 ||
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
	let seenIhdr = false
	const view = new DataView(buffer.buffer, buffer.byteOffset, buffer.byteLength)

	while (idx < buffer.length) {
		if (buffer.length - idx < 12) {
			throw new Error('.png file ended prematurely while reading a chunk')
		}

		const dataLength = view.getUint32(idx)
		if (dataLength > maxChunkBytes) {
			throw new Error(`PNG chunk exceeds size limit of ${maxChunkBytes} bytes`)
		}

		const typeStart = idx + 4
		const dataStart = typeStart + 4
		const dataEnd = dataStart + dataLength
		const chunkEnd = dataEnd + 4
		if (chunkEnd > buffer.length) {
			throw new Error('.png file ended prematurely while reading a chunk')
		}

		const name =
			String.fromCharCode(buffer[typeStart]) +
			String.fromCharCode(buffer[typeStart + 1]) +
			String.fromCharCode(buffer[typeStart + 2]) +
			String.fromCharCode(buffer[typeStart + 3])

		if (chunks.length === 0 && name !== 'IHDR') {
			throw new Error('IHDR header missing')
		}
		if (name === 'IHDR') {
			if (seenIhdr) throw new Error('PNG contains multiple IHDR chunks')
			if (dataLength !== 13) throw new Error('Invalid IHDR chunk length')
			seenIhdr = true
		}
		if (name === 'IEND' && dataLength !== 0) {
			throw new Error('Invalid IEND chunk length')
		}

		const crcActual = view.getUint32(dataEnd)
		const crcExpect = crc32(buffer.subarray(typeStart, dataEnd)) >>> 0

		if (crcExpect !== crcActual) {
			throw new Error(`CRC values for ${name} header do not match`)
		}

		chunks.push({
			name,
			data: buffer.subarray(dataStart, dataEnd),
		})
		idx = chunkEnd

		if (name === 'IEND') {
			ended = true
			if (idx !== buffer.length) {
				throw new Error('Unexpected data found after IEND chunk')
			}
			break
		}
	}

	if (!ended) {
		throw new Error('.png file ended prematurely: no IEND header was found')
	}

	return chunks
}
