import type { AssetId } from '../../character/entities/assets.entity'

export const MESSAGE_ASSET_MODALITIES = [
  'image',
  'audio',
  'video',
  'file',
] as const
export type MessageAssetModality = (typeof MESSAGE_ASSET_MODALITIES)[number]

export interface TextMessageContentPart {
  readonly type: 'text'
  readonly text: string
}

export interface AssetMessageContentPart {
  readonly type: 'asset'
  readonly assetId: AssetId
  readonly modality: MessageAssetModality
  readonly mediaType: string
  readonly altText: string | null
  readonly url?: string | null
}

export type MessageContentPart =
  | TextMessageContentPart
  | AssetMessageContentPart

export interface CreateAssetContentPartProps {
  assetId: AssetId
  modality: MessageAssetModality
  mediaType: string
  altText?: string | null
  url?: string | null
}

export class MessageContent {
  private constructor(private readonly _parts: readonly MessageContentPart[]) {}

  get parts(): readonly MessageContentPart[] {
    return this._parts.map(MessageContent.clonePart)
  }

  get text(): string {
    return this._parts
      .filter((part): part is TextMessageContentPart => part.type === 'text')
      .map((part) => part.text)
      .join('')
  }

  get isEmpty(): boolean {
    return !this._parts.some(
      (part) => part.type === 'asset' || part.text.trim().length > 0,
    )
  }

  static empty(): MessageContent {
    return new MessageContent([])
  }

  static create(parts: readonly MessageContentPart[]): MessageContent {
    return new MessageContent(parts.map(MessageContent.normalizePart))
  }

  static fromText(text: string): MessageContent {
    return MessageContent.create([{ type: 'text', text }])
  }

  static fromAsset(props: CreateAssetContentPartProps): MessageContent {
    return MessageContent.create([
      {
        type: 'asset',
        assetId: props.assetId,
        modality: props.modality,
        mediaType: props.mediaType,
        altText: props.altText ?? null,
        url: props.url ?? null,
      },
    ])
  }

  appendText(delta: string): MessageContent {
    if (!delta) return this

    const parts = [...this.parts]
    const lastPart = parts.at(-1)
    if (lastPart?.type === 'text') {
      parts[parts.length - 1] = {
        type: 'text',
        text: lastPart.text + delta,
      }
    } else {
      parts.push({ type: 'text', text: delta })
    }

    return MessageContent.create(parts)
  }

  appendPart(part: MessageContentPart): MessageContent {
    return MessageContent.create([...this._parts, part])
  }

  equals(other: MessageContent): boolean {
    if (this._parts.length !== other._parts.length) return false

    return this._parts.every((part, index) => {
      const otherPart = other._parts[index]
      if (part.type !== otherPart.type) return false
      if (part.type === 'text' && otherPart.type === 'text') {
        return part.text === otherPart.text
      }
      if (part.type === 'asset' && otherPart.type === 'asset') {
        return (
          part.assetId.equals(otherPart.assetId) &&
          part.modality === otherPart.modality &&
          part.mediaType === otherPart.mediaType &&
          part.altText === otherPart.altText &&
          part.url === otherPart.url
        )
      }
      return false
    })
  }

  private static normalizePart(part: MessageContentPart): MessageContentPart {
    if (part.type === 'text') {
      return { type: 'text', text: part.text }
    }

    const mediaType = part.mediaType.trim().toLowerCase()
    if (!mediaType) throw new Error('资产媒体类型不能为空')
    MessageContent.assertModalityMatchesMediaType(part.modality, mediaType)

    return {
      type: 'asset',
      assetId: part.assetId,
      modality: part.modality,
      mediaType,
      altText: MessageContent.normalizeOptionalText(part.altText),
      url: MessageContent.normalizeOptionalText(part.url ?? null),
    }
  }

  private static clonePart(part: MessageContentPart): MessageContentPart {
    return part.type === 'text' ? { ...part } : { ...part }
  }

  private static assertModalityMatchesMediaType(
    modality: MessageAssetModality,
    mediaType: string,
  ): void {
    if (modality === 'file') return
    if (!mediaType.startsWith(`${modality}/`)) {
      throw new Error(`媒体类型 ${mediaType} 与 ${modality} 模态不匹配`)
    }
  }

  private static normalizeOptionalText(value: string | null): string | null {
    const normalized = value?.trim() ?? ''
    return normalized || null
  }
}
