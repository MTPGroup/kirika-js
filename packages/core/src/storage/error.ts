export class StoredObjectNotFoundError extends Error {
  readonly key: string

  constructor(key: string) {
    super(`存储对象不存在: ${key}`)
    this.name = 'StoredObjectNotFoundError'
    this.key = key
  }
}
