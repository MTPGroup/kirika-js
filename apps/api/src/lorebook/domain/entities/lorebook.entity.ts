import { UserId } from '~/auth/user-id.vo'
import { AggregateRoot } from '~/shared/domain/aggregate-root.entity'
import { UuidId } from '~/shared/domain/uuid-id.vo'
import { LorebookEntry } from './lorebook-entry.entity'
import {
	LorebookRevision,
	LorebookRevisionId,
} from './lorebook-revision.entity'

const LOREBOOK_VISIBILITIES = ['private', 'unlisted', 'public'] as const

export type LorebookVisibility = (typeof LOREBOOK_VISIBILITIES)[number]

export class LorebookId extends UuidId {}

export class Lorebook extends AggregateRoot<LorebookId> {
	private readonly _revisions: Map<string, LorebookRevision>

	private constructor(
		id: LorebookId,
		private _name: string,
		private _description: string,
		readonly ownerId: UserId,
		private currentRevisionId: LorebookRevisionId | null = null,
		private _visibility: LorebookVisibility = 'private',
		revisions: LorebookRevision[] = [],
		readonly createdAt: Date = new Date(),
		private _updatedAt: Date = new Date(),
	) {
		if (!_name.trim()) throw new Error('世界书名称不能为空')

		super(id)
		this.assertValidRevisionState(revisions)
		this._revisions = new Map(
			revisions.map((revision) => [revision.id.value, revision]),
		)
	}

	get name(): string {
		return this._name
	}

	get description(): string {
		return this._description
	}

	get visibility(): LorebookVisibility {
		return this._visibility
	}

	get revisions(): readonly LorebookRevision[] {
		return Array.from(this._revisions.values())
	}

	get currentRevision(): LorebookRevision | null {
		try {
			return this.getRevision()
		} catch {
			return null
		}
	}

	get draftRevision(): LorebookRevision | null {
		for (const revision of this._revisions.values()) {
			if (revision.isDraft) {
				return revision
			}
		}

		return null
	}

	findRevision(revisionId: LorebookRevisionId): LorebookRevision | null {
		return this._revisions.get(revisionId.value) ?? null
	}

	get updatedAt(): Date {
		return this._updatedAt
	}

	static create(name: string, description: string, ownerId: UserId): Lorebook {
		const lorebook = new Lorebook(
			LorebookId.generate(),
			name,
			description,
			ownerId,
		)
		lorebook.createNewDraftRevision()

		return lorebook
	}

	static reconstitute(
		id: LorebookId,
		name: string,
		description: string,
		ownerId: UserId,
		currentRevisionId: LorebookRevisionId | null,
		visibility: LorebookVisibility,
		revisions: LorebookRevision[],
		createdAt: Date,
		updatedAt: Date,
	): Lorebook {
		return new Lorebook(
			id,
			name,
			description,
			ownerId,
			currentRevisionId,
			visibility,
			revisions,
			createdAt,
			updatedAt,
		)
	}

	changeVisibility(visibility: LorebookVisibility) {
		if (visibility !== 'private' && this.currentRevision === null) {
			throw new Error('没有已发布版本的世界书不能对外可见')
		}

		if (this._visibility === visibility) return

		this._visibility = visibility
		this.touch()
	}

	createNewDraftRevision(): LorebookRevision {
		if (this.draftRevision) {
			throw new Error('该世界书已存在草稿版本')
		}
		const sourceEntries =
			this.currentRevision?.entries.map((entry) => entry.clone()) ?? []

		const draft = LorebookRevision.createDraft(
			this.nextRevisionNumber(),
			sourceEntries,
		)

		this._revisions.set(draft.id.value, draft)
		this.touch()

		return draft
	}

	publishRevision(revisionId: LorebookRevisionId) {
		const revision = this.getRevision(revisionId)

		if (!revision.isDraft) {
			throw new Error('只能发布草稿版本')
		}

		revision.publish()
		this.currentRevisionId = revisionId
		this.touch()
	}

	replaceRevisionEntries(
		revisionId: LorebookRevisionId,
		entries: LorebookEntry[],
	) {
		const revision = this.getRevision(revisionId)
		revision.replaceEntries(entries)
		this.touch()
	}

	updateMetadata(name: string, description: string) {
		if (!name.trim()) throw new Error('世界书名称不能为空')

		this._name = name
		this._description = description
		this.touch()
	}

	private getRevision(revisionId?: LorebookRevisionId): LorebookRevision {
		const targetId = revisionId || this.currentRevisionId
		if (!targetId) {
			throw new Error('世界书中没有可用的版本')
		}

		const revision = this._revisions.get(targetId.value)
		if (!revision) throw new Error(`未找到 ${targetId} 对应的版本`)
		return revision
	}

	private nextRevisionNumber(): number {
		let max = 0

		for (const revision of this._revisions.values()) {
			max = Math.max(max, revision.revisionNumber)
		}

		return max + 1
	}

	private assertValidRevisionState(
		revisions: readonly LorebookRevision[],
	): void {
		const revisionIds = new Set<string>()
		const revisionNumbers = new Set<number>()
		let draftCount = 0

		for (const revision of revisions) {
			if (revisionIds.has(revision.id.value)) {
				throw new Error(`世界书版本 ID 重复: ${revision.id.value}`)
			}
			if (revisionNumbers.has(revision.revisionNumber)) {
				throw new Error(`世界书版本号重复: ${revision.revisionNumber}`)
			}

			revisionIds.add(revision.id.value)
			revisionNumbers.add(revision.revisionNumber)
			if (revision.isDraft) draftCount += 1
		}

		if (draftCount > 1) throw new Error('世界书最多只能存在一个草稿版本')

		if (this.currentRevisionId) {
			const currentRevision = revisions.find((revision) =>
				revision.id.equals(this.currentRevisionId),
			)
			if (!currentRevision) {
				throw new Error('当前世界书版本不属于该世界书')
			}
			if (currentRevision.isDraft) {
				throw new Error('当前世界书版本不能指向草稿')
			}
		}

		if (this._visibility !== 'private' && !this.currentRevisionId) {
			throw new Error('没有已发布版本的世界书不能对外可见')
		}
	}

	private touch() {
		this._updatedAt = new Date()
	}
}
