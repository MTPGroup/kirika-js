import type {
  CharacterCardDocument,
  CharacterCardDocumentInput,
} from '../model/character-card-document'

export interface CharacterCardSource {
  readonly data: Uint8Array
  readonly mediaType?: string
  readonly fileName?: string
}

export interface EncodedCharacterCard {
  readonly format: string
  readonly data: Uint8Array
  readonly mediaType: string
  readonly fileExtension?: string
}

export interface CharacterCardCodecOutput {
  readonly data: Uint8Array
  readonly mediaType: string
  readonly fileExtension?: string
}

export interface CharacterCardCodec {
  readonly format: string

  canDecode(source: CharacterCardSource): boolean | Promise<boolean>

  decode(
    source: CharacterCardSource,
  ): CharacterCardDocumentInput | Promise<CharacterCardDocumentInput>

  encode(
    card: CharacterCardDocument,
  ): CharacterCardCodecOutput | Promise<CharacterCardCodecOutput>
}
