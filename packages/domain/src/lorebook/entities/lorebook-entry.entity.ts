import { Entity } from '../../shared/base.entity'
import { UuidId } from '../../shared/uuid-id.vo'

const LORE_ENTRY_POSITIONS = [
  'before_history',
  'after_history',
  'at_depth',
] as const
export type LoreEntryPosition = (typeof LORE_ENTRY_POSITIONS)[number]
export type LoreEntryMatchMode = 'any' | 'all'

export interface LorebookEntryOptions {
  readonly secondaryKeys?: readonly string[]
  readonly matchMode?: LoreEntryMatchMode
  readonly constant?: boolean
  readonly caseSensitive?: boolean
  readonly matchWholeWords?: boolean
  readonly probability?: number
  readonly insertionDepth?: number
}

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
    private _secondaryKeys: readonly string[] = [],
    private _matchMode: LoreEntryMatchMode = 'any',
    private _constant = false,
    private _caseSensitive = false,
    private _matchWholeWords = false,
    private _probability = 100,
    private _insertionDepth = 0,
  ) {
    super(id)
    const keys = normalizeKeys(_keys)
    const secondaryKeys = normalizeKeys(_secondaryKeys)

    if (!_constant && keys.length === 0) {
      throw new Error('非固定世界书条目至少需要一个触发关键词')
    }
    if (!_title.trim()) throw new Error('世界书条目标题不能为空')
    if (!_content.trim()) throw new Error('世界书条目内容不能为空')
    if (!Number.isInteger(_priority))
      throw new Error('世界书条目优先级必须是整数')
    if (
      !Number.isInteger(_probability) ||
      _probability < 0 ||
      _probability > 100
    )
      throw new Error('世界书条目触发概率必须是 0 到 100 的整数')
    if (!Number.isInteger(_insertionDepth) || _insertionDepth < 0)
      throw new Error('世界书条目插入深度必须是非负整数')
    if (_position !== 'at_depth' && _insertionDepth !== 0)
      throw new Error('只有指定深度位置可以设置插入深度')

    this._keys = keys
    this._secondaryKeys = secondaryKeys
    this._title = _title.trim()
    this._content = _content.trim()
  }

  get keys(): readonly string[] {
    return [...this._keys]
  }

  get secondaryKeys(): readonly string[] {
    return [...this._secondaryKeys]
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

  get matchMode(): LoreEntryMatchMode {
    return this._matchMode
  }

  get constant(): boolean {
    return this._constant
  }

  get caseSensitive(): boolean {
    return this._caseSensitive
  }

  get matchWholeWords(): boolean {
    return this._matchWholeWords
  }

  get probability(): number {
    return this._probability
  }

  get insertionDepth(): number {
    return this._insertionDepth
  }

  static create(
    keys: string[],
    title: string,
    enabled: boolean,
    content: string,
    position: LoreEntryPosition,
    priority: number,
    options: LorebookEntryOptions = {},
  ): LorebookEntry {
    return new LorebookEntry(
      LorebookEntryId.generate(),
      keys,
      title,
      enabled,
      content,
      position,
      priority,
      options.secondaryKeys,
      options.matchMode,
      options.constant,
      options.caseSensitive,
      options.matchWholeWords,
      options.probability,
      options.insertionDepth,
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
    options: LorebookEntryOptions = {},
  ): LorebookEntry {
    return new LorebookEntry(
      id,
      keys,
      title,
      enabled,
      content,
      position,
      priority,
      options.secondaryKeys,
      options.matchMode,
      options.constant,
      options.caseSensitive,
      options.matchWholeWords,
      options.probability,
      options.insertionDepth,
    )
  }

  isTriggeredBy(text: string, random: () => number = Math.random): boolean {
    if (!this.enabled || this.probability === 0) return false
    const keywordMatch =
      this.constant ||
      matchKeywords(
        [...this.keys, ...this.secondaryKeys],
        text,
        this.matchMode,
        this.caseSensitive,
        this.matchWholeWords,
      )
    if (!keywordMatch) return false
    return this.probability === 100 || random() * 100 < this.probability
  }

  clone(): LorebookEntry {
    return LorebookEntry.create(
      [...this.keys],
      this.title,
      this.enabled,
      this.content,
      this.position,
      this.priority,
      {
        secondaryKeys: this.secondaryKeys,
        matchMode: this.matchMode,
        constant: this.constant,
        caseSensitive: this.caseSensitive,
        matchWholeWords: this.matchWholeWords,
        probability: this.probability,
        insertionDepth: this.insertionDepth,
      },
    )
  }
}

function normalizeKeys(keys: readonly string[] | undefined): string[] {
  return [...new Set((keys ?? []).map((key) => key.trim()).filter(Boolean))]
}

function matchKeywords(
  keys: readonly string[],
  text: string,
  mode: LoreEntryMatchMode,
  caseSensitive: boolean,
  wholeWords: boolean,
): boolean {
  if (keys.length === 0) return false
  const source = caseSensitive ? text : text.toLocaleLowerCase()
  const matches = keys.map((key) => {
    const candidate = caseSensitive ? key : key.toLocaleLowerCase()
    if (!wholeWords) return source.includes(candidate)
    const escaped = candidate.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    return new RegExp(
      `(?:^|\\b)${escaped}(?:\\b|$)`,
      caseSensitive ? '' : 'i',
    ).test(text)
  })
  return mode === 'all' ? matches.every(Boolean) : matches.some(Boolean)
}
