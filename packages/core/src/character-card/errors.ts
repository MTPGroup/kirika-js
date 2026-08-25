export class CharacterCardError extends Error {
  constructor(message: string, options?: ErrorOptions) {
    super(message, options)
    this.name = new.target.name
  }
}

export class InvalidCharacterCardError extends CharacterCardError {}

export class UnsupportedCharacterCardFormatError extends CharacterCardError {
  constructor(readonly format?: string) {
    super(format ? `不支持的角色卡格式: ${format}` : '无法识别该角色卡的格式')
  }
}

export class CharacterCardResourceMappingError extends CharacterCardError {}
