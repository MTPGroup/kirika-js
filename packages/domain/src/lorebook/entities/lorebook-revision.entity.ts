import { Entity } from '../../shared/base.entity'
import { UuidId } from '../../shared/uuid-id.vo'
import type { LorebookEntry } from './lorebook-entry.entity'

export class LorebookRevisionId extends UuidId {}

export interface LorebookRevisionSettings {
  readonly scanDepth?: number
  readonly tokenBudget?: number
}

export class LorebookRevision extends Entity<LorebookRevisionId> {
  private readonly _entries: Map<string, LorebookEntry>

  private constructor(
    id: LorebookRevisionId,
    readonly revisionNumber: number,
    private _isDraft = true,
    entries: LorebookEntry[] = [],
    private _scanDepth = 20,
    private _tokenBudget = 2048,
  ) {
    if (!Number.isInteger(revisionNumber) || revisionNumber < 1) {
      throw new Error('非法的版本号，需要 >= 1')
    }
    assertSettings(_scanDepth, _tokenBudget)

    super(id)
    if (
      new Set(entries.map((entry) => entry.id.value)).size !== entries.length
    ) {
      throw new Error('世界书条目 ID 重复')
    }
    this._entries = new Map(entries.map((entry) => [entry.id.value, entry]))
  }

  get isDraft(): boolean {
    return this._isDraft
  }

  get entries(): readonly LorebookEntry[] {
    return Array.from(this._entries.values())
  }

  get scanDepth(): number {
    return this._scanDepth
  }

  get tokenBudget(): number {
    return this._tokenBudget
  }

  static createDraft(
    revisionNumber: number,
    entries: LorebookEntry[],
    settings: LorebookRevisionSettings = {},
  ) {
    return new LorebookRevision(
      LorebookRevisionId.generate(),
      revisionNumber,
      true,
      entries,
      settings.scanDepth,
      settings.tokenBudget,
    )
  }

  static reconstitute(
    id: LorebookRevisionId,
    revisionNumber: number,
    isDraft: boolean,
    entries: LorebookEntry[],
    settings: LorebookRevisionSettings = {},
  ): LorebookRevision {
    return new LorebookRevision(
      id,
      revisionNumber,
      isDraft,
      entries,
      settings.scanDepth,
      settings.tokenBudget,
    )
  }

  upsertEntry(entry: LorebookEntry) {
    this.ensureDraft()
    this._entries.set(entry.id.value, entry)
  }

  replaceEntries(entries: LorebookEntry[]) {
    this.ensureDraft()
    if (new Set(entries.map((entry) => entry.id.value)).size !== entries.length)
      throw new Error('世界书条目 ID 重复')
    this._entries.clear()
    for (const entry of entries) this._entries.set(entry.id.value, entry)
  }

  updateSettings(settings: LorebookRevisionSettings) {
    this.ensureDraft()
    const scanDepth = settings.scanDepth ?? this._scanDepth
    const tokenBudget = settings.tokenBudget ?? this._tokenBudget
    assertSettings(scanDepth, tokenBudget)
    this._scanDepth = scanDepth
    this._tokenBudget = tokenBudget
  }

  publish() {
    if (!this._isDraft) throw new Error('该版本已经发布')
    if (this._entries.size === 0) throw new Error('不能发布条目为空的世界书')
    this._isDraft = false
  }

  matchEntries(inputText: string): LorebookEntry[] {
    return this.entries
      .filter((entry) => entry.isTriggeredBy(inputText))
      .sort((a, b) => b.priority - a.priority)
  }

  private ensureDraft() {
    if (!this._isDraft) throw new Error('已发布的版本不能更改')
  }
}

function assertSettings(scanDepth: number, tokenBudget: number) {
  if (!Number.isInteger(scanDepth) || scanDepth < 1 || scanDepth > 1000)
    throw new Error('世界书扫描深度必须是 1 到 1000 的整数')
  if (
    !Number.isInteger(tokenBudget) ||
    tokenBudget < 1 ||
    tokenBudget > 1_000_000
  )
    throw new Error('世界书 Token 预算必须是 1 到 1000000 的整数')
}
