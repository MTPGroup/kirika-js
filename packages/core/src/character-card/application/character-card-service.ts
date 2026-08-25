import {
  InvalidCharacterCardError,
  UnsupportedCharacterCardFormatError,
} from '../errors'
import {
  type CharacterCardDocument,
  type CharacterCardDocumentInput,
  createCharacterCardDocument,
} from '../model/character-card-document'
import type {
  CharacterCardCodec,
  CharacterCardSource,
  EncodedCharacterCard,
} from '../ports/character-card-codec.port'

export interface ImportedCharacterCard {
  readonly format: string
  readonly card: CharacterCardDocument
}

export class CharacterCardService {
  private readonly codecs: readonly CharacterCardCodec[]
  private readonly codecsByFormat: ReadonlyMap<string, CharacterCardCodec>

  constructor(codecs: readonly CharacterCardCodec[]) {
    const codecsByFormat = new Map<string, CharacterCardCodec>()

    for (const codec of codecs) {
      const format = normalizeFormat(codec.format)
      if (codecsByFormat.has(format)) {
        throw new Error(`角色卡 codec 格式重复: ${format}`)
      }
      codecsByFormat.set(format, codec)
    }

    this.codecs = [...codecs]
    this.codecsByFormat = codecsByFormat
  }

  get supportedFormats(): readonly string[] {
    return this.codecs.map((codec) => normalizeFormat(codec.format))
  }

  async importCard(
    source: CharacterCardSource,
    formatHint?: string,
  ): Promise<ImportedCharacterCard> {
    assertSource(source)
    const safeSource = cloneSource(source)
    const codec = formatHint
      ? this.findCodec(formatHint)
      : await this.detectCodec(safeSource)
    const decoded = await codec.decode(safeSource)

    return {
      format: normalizeFormat(codec.format),
      card: createCharacterCardDocument(decoded),
    }
  }

  async exportCard(
    card: CharacterCardDocumentInput,
    format: string,
  ): Promise<EncodedCharacterCard> {
    const codec = this.findCodec(format)
    const normalized = createCharacterCardDocument(card)
    const encoded = await codec.encode(normalized)
    if (
      !(encoded.data instanceof Uint8Array) ||
      encoded.data.byteLength === 0
    ) {
      throw new InvalidCharacterCardError('角色卡 codec 返回了空的编码结果')
    }
    if (!encoded.mediaType.trim()) {
      throw new InvalidCharacterCardError('角色卡 codec 未返回媒体类型')
    }

    return {
      format: normalizeFormat(codec.format),
      data: new Uint8Array(encoded.data),
      mediaType: encoded.mediaType.trim(),
      fileExtension: encoded.fileExtension?.trim() || undefined,
    }
  }

  private findCodec(format: string): CharacterCardCodec {
    const normalized = normalizeFormat(format)
    const codec = this.codecsByFormat.get(normalized)
    if (!codec) throw new UnsupportedCharacterCardFormatError(normalized)
    return codec
  }

  private async detectCodec(
    source: CharacterCardSource,
  ): Promise<CharacterCardCodec> {
    for (const codec of this.codecs) {
      if (await codec.canDecode(cloneSource(source))) return codec
    }

    throw new UnsupportedCharacterCardFormatError()
  }
}

function normalizeFormat(format: string): string {
  const normalized = format.trim().toLocaleLowerCase()
  if (!normalized) throw new Error('角色卡 codec 格式不能为空')
  return normalized
}

function assertSource(source: CharacterCardSource): void {
  if (!(source.data instanceof Uint8Array) || source.data.byteLength === 0) {
    throw new InvalidCharacterCardError('角色卡输入不能为空')
  }
}

function cloneSource(source: CharacterCardSource): CharacterCardSource {
  return {
    data: new Uint8Array(source.data),
    mediaType: source.mediaType,
    fileName: source.fileName,
  }
}
