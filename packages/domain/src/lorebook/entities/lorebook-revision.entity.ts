import { Entity } from '../../shared/base.entity'
import { UuidId } from '../../shared/uuid-id.vo'
import type { LorebookEntry } from './lorebook-entry.entity'

export class LorebookRevisionId extends UuidId {}

export class LorebookRevision extends Entity<LorebookRevisionId> {
	private readonly _entries: Map<string, LorebookEntry>

	private constructor(
		id: LorebookRevisionId,
		readonly revisionNumber: number,
		private _isDraft: boolean = true,
		entries: LorebookEntry[] = [],
	) {
		if (!Number.isInteger(revisionNumber) || revisionNumber < 1) {
			throw new Error('非法的版本号，需要 >= 1')
		}

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

	static createDraft(revisionNumber: number, entries: LorebookEntry[]) {
		return new LorebookRevision(
			LorebookRevisionId.generate(),
			revisionNumber,
			true,
			entries,
		)
	}

	static reconstitute(
		id: LorebookRevisionId,
		revisionNumber: number,
		isDraft: boolean,
		entries: LorebookEntry[],
	): LorebookRevision {
		return new LorebookRevision(id, revisionNumber, isDraft, entries)
	}

	upsertEntry(entry: LorebookEntry) {
		this.ensureDraft()
		this._entries.set(entry.id.value, entry)
	}

	replaceEntries(entries: LorebookEntry[]) {
		this.ensureDraft()
		this._entries.clear()

		for (const entry of entries) {
			this._entries.set(entry.id.value, entry)
		}
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
