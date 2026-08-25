import { describe, expect, it } from 'vitest'
import type {
  CharacterCardCodec,
  CharacterCardCodecOutput,
  CharacterCardDocument,
  CharacterCardDocumentInput,
  CharacterCardSource,
} from './index'
import {
  CharacterCardCodecRegistry,
  InvalidCharacterCardError,
  UnsupportedCharacterCardFormatError,
} from './index'

class TestCodec implements CharacterCardCodec {
  constructor(
    readonly format: string,
    private readonly mediaType: string,
    private readonly decoded: CharacterCardDocumentInput,
  ) {}

  canDecode(source: CharacterCardSource): boolean {
    return source.mediaType === this.mediaType
  }

  decode(): CharacterCardDocumentInput {
    return this.decoded
  }

  encode(card: CharacterCardDocument): CharacterCardCodecOutput {
    return {
      data: new TextEncoder().encode(card.name),
      mediaType: this.mediaType,
      fileExtension: `.${this.format.toLocaleLowerCase()}`,
    }
  }
}

describe('CharacterCardCodecRegistry', () => {
  const jsonCodec = new TestCodec('JSON', 'application/json', {
    name: '露娜',
  })
  const pngCodec = new TestCodec('png', 'image/png', { name: '菈妮' })

  it('按内容探测 codec，也允许调用方显式指定格式', async () => {
    const service = new CharacterCardCodecRegistry([jsonCodec, pngCodec])

    await expect(
      service.importCard({
        data: new Uint8Array([1]),
        mediaType: 'image/png',
      }),
    ).resolves.toMatchObject({ format: 'png', card: { name: '菈妮' } })
    await expect(
      service.importCard({ data: new Uint8Array([1]) }, ' JSON '),
    ).resolves.toMatchObject({ format: 'json', card: { name: '露娜' } })
    expect(service.supportedFormats).toEqual(['json', 'png'])
  })

  it('使用指定 codec 导出规范化后的角色卡', async () => {
    const service = new CharacterCardCodecRegistry([jsonCodec])
    const result = await service.exportCard({ name: ' 露娜 ' }, 'json')

    expect(result).toEqual({
      format: 'json',
      data: new TextEncoder().encode('露娜'),
      mediaType: 'application/json',
      fileExtension: '.json',
    })
  })

  it('拒绝重复 codec、未知格式和空输入', async () => {
    expect(
      () =>
        new CharacterCardCodecRegistry([
          jsonCodec,
          new TestCodec('json', 'x', { name: 'x' }),
        ]),
    ).toThrow('角色卡 codec 格式重复: json')

    const service = new CharacterCardCodecRegistry([jsonCodec])
    await expect(
      service.importCard({
        data: new Uint8Array([1]),
        mediaType: 'text/plain',
      }),
    ).rejects.toBeInstanceOf(UnsupportedCharacterCardFormatError)
    await expect(
      service.importCard({ data: new Uint8Array() }),
    ).rejects.toBeInstanceOf(InvalidCharacterCardError)
    await expect(
      service.exportCard({ name: '露娜' }, 'png'),
    ).rejects.toBeInstanceOf(UnsupportedCharacterCardFormatError)
  })
})
