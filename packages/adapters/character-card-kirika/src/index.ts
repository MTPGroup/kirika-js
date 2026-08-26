import { deflateSync, inflateSync } from 'node:zlib'
import {
  type CharacterCardCodec,
  type CharacterCardCodecOutput,
  CharacterCardCodecRegistry,
  type CharacterCardDocument,
  type CharacterCardDocumentInput,
  type CharacterCardSource,
} from '@kirika-js/core/character-card'

const PNG_SIGNATURE = Buffer.from([
  0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
])
const KIRIKA_SCHEMA = 'https://api.kirika.cn/schemas/character-card/v1.json'
const KIRIKA_FORMAT = 'kirika-character-card'
const KIRIKA_PNG_KEYWORD = 'kirika-card'

export type KirikaCardFormat = 'kirika-json' | 'kirika-png'

export class KirikaCharacterCardCodec implements CharacterCardCodec {
  constructor(readonly format: KirikaCardFormat) {}

  canDecode(source: CharacterCardSource): boolean {
    try {
      if (this.format === 'kirika-json') {
        parseKirikaEnvelope(source.data)
        return true
      }

      return extractKirikaPngPayload(source.data) !== undefined
    } catch {
      return false
    }
  }

  decode(source: CharacterCardSource): CharacterCardDocumentInput {
    if (this.format === 'kirika-json') {
      return parseKirikaEnvelope(source.data)
    }

    const payload = extractKirikaPngPayload(source.data)
    if (!payload) throw new Error('PNG 不包含 Kirika 角色卡元数据')
    return parseKirikaEnvelope(Buffer.from(payload, 'utf8'))
  }

  encode(card: CharacterCardDocument): CharacterCardCodecOutput {
    const envelope = serializeKirikaEnvelope(card)

    if (this.format === 'kirika-json') {
      return {
        data: Buffer.from(JSON.stringify(envelope, null, 2), 'utf8'),
        mediaType: 'application/json',
        fileExtension: 'json',
      }
    }

    const avatar = card.assets.find(
      (asset) => asset.kind === 'avatar' && asset.data,
    )
    if (!avatar?.data) {
      throw new Error(
        'Kirika PNG 角色卡导出至少需要一个带二进制数据的 avatar 资产',
      )
    }
    if (!isPng(avatar.data)) {
      throw new Error('Kirika PNG 角色卡的 avatar 必须是 PNG 数据')
    }

    return {
      data: injectKirikaPngPayload(avatar.data, JSON.stringify(envelope)),
      mediaType: 'image/png',
      fileExtension: 'png',
    }
  }
}

export function createKirikaCardCodecs(): CharacterCardCodec[] {
  return [
    new KirikaCharacterCardCodec('kirika-json'),
    new KirikaCharacterCardCodec('kirika-png'),
  ]
}

export const kirikaCharacterCardRegistry = new CharacterCardCodecRegistry(
  createKirikaCardCodecs(),
)

function serializeKirikaEnvelope(card: CharacterCardDocument) {
  return {
    $schema: KIRIKA_SCHEMA,
    format: KIRIKA_FORMAT,
    version: 1,
    document: {
      modelVersion: card.modelVersion,
      name: card.name,
      description: card.description,
      personality: card.personality,
      scenario: card.scenario,
      systemPrompt: card.systemPrompt,
      postHistoryInstructions: card.postHistoryInstructions,
      greetings: [...card.greetings],
      examples: [...card.examples],
      extensions: card.extensions,
      assets: card.assets.map((asset) => ({
        kind: asset.kind,
        name: asset.name,
        ordinal: asset.ordinal,
        uri: asset.uri,
        mediaType: asset.mediaType,
        data: asset.data
          ? Buffer.from(asset.data).toString('base64')
          : undefined,
        extensions: asset.extensions,
      })),
      lorebooks: card.lorebooks,
    },
  }
}
type SerializedDocument = Omit<CharacterCardDocumentInput, 'assets'> & {
  assets?: Array<
    NonNullable<CharacterCardDocumentInput['assets']>[number] & {
      data?: unknown
    }
  >
}

function parseKirikaEnvelope(data: Uint8Array): CharacterCardDocumentInput {
  const raw = JSON.parse(Buffer.from(data).toString('utf8')) as unknown
  if (!isRecord(raw)) throw new Error('Kirika 角色卡必须是 JSON 对象')
  if (raw.$schema !== KIRIKA_SCHEMA) {
    throw new Error('不支持的 Kirika 角色卡 schema')
  }
  if (raw.format !== KIRIKA_FORMAT || raw.version !== 1) {
    throw new Error('不支持的 Kirika 角色卡版本')
  }
  if (!isRecord(raw.document)) throw new Error('Kirika 角色卡缺少 document')

  const document = raw.document as unknown as SerializedDocument

  return {
    ...document,
    modelVersion: 2,
    assets: document.assets?.map((asset) => ({
      ...asset,
      data:
        typeof asset.data === 'string'
          ? new Uint8Array(Buffer.from(asset.data, 'base64'))
          : undefined,
    })),
  }
}

function extractKirikaPngPayload(data: Uint8Array): string | undefined {
  if (!isPng(data)) return undefined

  for (const chunk of parsePngChunks(data)) {
    if (chunk.type !== 'iTXt') continue
    const text = decodeInternationalText(chunk.data)
    if (text?.keyword === KIRIKA_PNG_KEYWORD) return text.value
  }

  return undefined
}

function injectKirikaPngPayload(
  source: Uint8Array,
  payload: string,
): Uint8Array {
  const input = Buffer.from(source)
  const metadata = createInternationalTextChunk(KIRIKA_PNG_KEYWORD, payload)
  const parts: Buffer[] = [input.subarray(0, PNG_SIGNATURE.length)]
  let inserted = false

  for (const chunk of parsePngChunks(input)) {
    const existing =
      chunk.type === 'iTXt' &&
      decodeInternationalText(chunk.data)?.keyword === KIRIKA_PNG_KEYWORD
    if (existing) continue

    if (chunk.type === 'IEND' && !inserted) {
      parts.push(metadata)
      inserted = true
    }
    parts.push(input.subarray(chunk.start, chunk.end))
  }

  if (!inserted) throw new Error('PNG 缺少 IEND chunk')
  return Buffer.concat(parts)
}

function createInternationalTextChunk(keyword: string, value: string): Buffer {
  const compressed = deflateSync(Buffer.from(value, 'utf8'))
  const data = Buffer.concat([
    Buffer.from(`${keyword}\0`, 'latin1'),
    Buffer.from([1, 0, 0, 0]),
    compressed,
  ])
  return createPngChunk('iTXt', data)
}

function decodeInternationalText(
  data: Buffer,
): { keyword: string; value: string } | undefined {
  const keywordEnd = data.indexOf(0)
  if (keywordEnd <= 0 || keywordEnd + 4 > data.length) return undefined

  const keyword = data.subarray(0, keywordEnd).toString('latin1')
  const compressionFlag = data[keywordEnd + 1]
  const compressionMethod = data[keywordEnd + 2]
  if (compressionFlag !== 0 && compressionFlag !== 1) return undefined
  if (compressionFlag === 1 && compressionMethod !== 0) return undefined

  const languageStart = keywordEnd + 3
  const languageEnd = data.indexOf(0, languageStart)
  if (languageEnd < 0) return undefined
  const translatedEnd = data.indexOf(0, languageEnd + 1)
  if (translatedEnd < 0) return undefined

  const text = data.subarray(translatedEnd + 1)
  const value =
    compressionFlag === 1
      ? inflateSync(text).toString('utf8')
      : text.toString('utf8')
  return { keyword, value }
}

function createPngChunk(type: string, data: Buffer): Buffer {
  const typeBytes = Buffer.from(type, 'ascii')
  const length = Buffer.alloc(4)
  length.writeUInt32BE(data.length)
  const crc = Buffer.alloc(4)
  crc.writeUInt32BE(crc32(Buffer.concat([typeBytes, data])))
  return Buffer.concat([length, typeBytes, data, crc])
}

function parsePngChunks(data: Uint8Array) {
  const input = Buffer.from(data)
  if (!isPng(input)) throw new Error('无效 PNG 签名')

  const chunks: Array<{
    type: string
    data: Buffer
    start: number
    end: number
  }> = []
  let offset = PNG_SIGNATURE.length
  while (offset < input.length) {
    if (offset + 12 > input.length) throw new Error('PNG chunk 截断')
    const length = input.readUInt32BE(offset)
    const start = offset
    const type = input.subarray(offset + 4, offset + 8).toString('ascii')
    const dataStart = offset + 8
    const dataEnd = dataStart + length
    const end = dataEnd + 4
    if (end > input.length) throw new Error('PNG chunk 长度非法')

    chunks.push({ type, data: input.subarray(dataStart, dataEnd), start, end })
    offset = end
  }

  return chunks
}

function isPng(data: Uint8Array): boolean {
  return (
    data.length >= PNG_SIGNATURE.length &&
    PNG_SIGNATURE.every((byte, index) => data[index] === byte)
  )
}

function crc32(data: Buffer): number {
  let crc = 0xffffffff
  for (const byte of data) {
    crc ^= byte
    for (let bit = 0; bit < 8; bit += 1) {
      crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0)
    }
  }
  return (crc ^ 0xffffffff) >>> 0
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}
