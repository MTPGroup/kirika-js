import { Entity } from '../../shared/base.entity'
import { UuidId } from '../../shared/uuid-id.vo'

export const ASSET_KINDS = [
  'avatar',
  'background',
  'emotion',
  'audio',
  'video',
  'model',
  'other',
] as const

export type AssetKind = (typeof ASSET_KINDS)[number]

export class AssetId extends UuidId {}

export class Asset extends Entity<AssetId> {
  private constructor(
    id: AssetId,
    readonly storageKey: string | null,
    readonly mediaType: string | null,
    readonly byteSize: number | null,
    readonly sha256: string | null,
  ) {
    super(id)

    if (storageKey !== null && !storageKey.trim()) {
      throw new Error('资产存储键不能为空')
    }
    if (mediaType !== null && !mediaType.trim()) {
      throw new Error('资产媒体类型不能为空')
    }
    if (
      byteSize !== null &&
      (!Number.isSafeInteger(byteSize) || byteSize < 0)
    ) {
      throw new Error('资产字节数必须是非负安全整数')
    }
    if (sha256 !== null && !/^[a-f\d]{64}$/i.test(sha256)) {
      throw new Error('资产 SHA-256 必须是 64 位十六进制字符串')
    }
  }

  static create(
    storageKey: string,
    mediaType: string,
    byteSize: number,
    sha256: string,
  ): Asset {
    return new Asset(
      AssetId.generate(),
      storageKey.trim(),
      mediaType.trim(),
      byteSize,
      sha256.toLowerCase(),
    )
  }

  static reconstitute(
    id: AssetId,
    storageKey: string | null,
    mediaType: string | null,
    byteSize: number | null,
    sha256: string | null,
  ): Asset {
    return new Asset(
      id,
      storageKey?.trim() ?? null,
      mediaType?.trim() ?? null,
      byteSize,
      sha256?.toLowerCase() ?? null,
    )
  }
}

export interface CharacterRevisionAssetProps {
  assetId: AssetId
  kind: AssetKind
  name: string
  uri: string
  ordinal: number
  extensions?: Readonly<Record<string, unknown>>
}

export class CharacterRevisionAsset {
  readonly assetId: AssetId
  readonly kind: AssetKind
  readonly name: string
  readonly uri: string
  readonly ordinal: number
  private readonly _extensions: Readonly<Record<string, unknown>>

  constructor(props: CharacterRevisionAssetProps) {
    if (!ASSET_KINDS.includes(props.kind)) {
      throw new Error(`不支持的角色资产类型: ${props.kind}`)
    }
    if (!props.name.trim()) throw new Error('角色资产名称不能为空')
    if (!props.uri.trim()) throw new Error('角色资产 URI 不能为空')
    if (!Number.isInteger(props.ordinal) || props.ordinal < 0) {
      throw new Error('角色资产序号必须是非负整数')
    }

    this.assetId = props.assetId
    this.kind = props.kind
    this.name = props.name.trim()
    this.uri = props.uri.trim()
    this.ordinal = props.ordinal
    this._extensions = structuredClone(props.extensions ?? {})
  }

  get extensions(): Readonly<Record<string, unknown>> {
    return structuredClone(this._extensions)
  }

  clone(): CharacterRevisionAsset {
    return new CharacterRevisionAsset({
      assetId: this.assetId,
      kind: this.kind,
      name: this.name,
      uri: this.uri,
      ordinal: this.ordinal,
      extensions: this._extensions,
    })
  }
}
