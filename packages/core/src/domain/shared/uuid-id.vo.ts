import { v4 as uuidv4, validate } from 'uuid'

export interface EntityId {
  equals(other: unknown): boolean
  toString(): string
}

export class UuidId implements EntityId {
  readonly value: string

  constructor(value: string) {
    if (!validate(value)) {
      throw Error('非法的 uuid')
    }

    this.value = value
  }

  static generate<T extends UuidId>(this: new (value: string) => T): T {
    return new this(uuidv4())
  }

  equals(other: unknown): boolean {
    if (!(other instanceof UuidId)) return false
    return other.constructor === this.constructor && this.value === other.value
  }

  toString(): string {
    return this.value
  }
}
