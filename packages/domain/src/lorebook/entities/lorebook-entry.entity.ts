import { Entity } from '../../shared/base.entity'
import { UuidId } from '../../shared/uuid-id.vo'

const LORE_ENTRY_POSITIONS = ['before_history', 'after_history'] as const
export type LoreEntryPosition = (typeof LORE_ENTRY_POSITIONS)[number]

export class LorebookEntryId extends UuidId {}

export class LorebookEntry extends Entity<LorebookEntryId> {
  private constructor(
    id: LorebookEntryId,
    private _keys: readonly string[],
    private _title: string,
    private _enabled: boolean,
    private _content: string,
    private _position: LoreEntryPosition,
    private _priority: number,
  ) {
    super(id)
    const keys = [...new Set(_keys.map((key) => key.trim()).filter(Boolean))]

    if (keys.length === 0) {
      throw new Error('世界书条目至少需要一个触发关键词')
    }
    if (!_title.trim()) throw new Error('世界书条目标题不能为空')
    if (!_content.trim()) throw new Error('世界书条目内容不能为空')

    this._keys = keys
    this._title = _title.trim()
  }

  get keys(): readonly string[] {
    return [...this._keys]
  }

  get title(): string {
    return this._title
  }

  get enabled(): boolean {
    return this._enabled
  }

  get position(): LoreEntryPosition {
    return this._position
  }

  get priority(): number {
    return this._priority
  }

  get content(): string {
    return this._content
  }

  static create(
    keys: string[],
    title: string,
    enabled: boolean,
    content: string,
    position: LoreEntryPosition,
    priority: number,
  ): LorebookEntry {
    return new LorebookEntry(
      LorebookEntryId.generate(),
      keys,
      title,
      enabled,
      content,
      position,
      priority,
    )
  }

  static reconstitute(
    id: LorebookEntryId,
    keys: string[],
    title: string,
    enabled: boolean,
    content: string,
    position: LoreEntryPosition,
    priority: number,
  ): LorebookEntry {
    return new LorebookEntry(
      id,
      keys,
      title,
      enabled,
      content,
      position,
      priority,
    )
  }

  isTriggeredBy(text: string): boolean {
    if (!this.enabled) return false
    return this.keys.some((key) => text.includes(key))
  }

  clone(): LorebookEntry {
    return LorebookEntry.create(
      [...this.keys],
      this.title,
      this.enabled,
      this.content,
      this.position,
      this.priority,
    )
  }
}
