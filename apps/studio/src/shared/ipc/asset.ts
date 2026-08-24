import type { AssetKind } from '@kirika-js/domain/character'

export interface AssetDto {
  readonly id: string
  readonly storageKey: string | null
  readonly mediaType: string | null
  readonly byteSize: number | null
  readonly sha256: string | null
}

export interface CharacterRevisionAssetDto {
  readonly assetId: string
  readonly kind: AssetKind
  readonly name: string
  readonly uri: string
  readonly ordinal: number
  readonly extensions: Readonly<Record<string, unknown>>
}
