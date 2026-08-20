import { UserId } from '~/auth/user-id.vo'
import { AggregateRoot } from '~/shared/domain/aggregate-root.entity'
import { UuidId } from '~/shared/domain/uuid-id.vo'
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

	get activeRevision(): LorebookRevision | null {
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
		if (visibility !== 'private' && this.activeRevision === null) {
			throw new Error('没有已发布版本的世界书不能对外可见')
		}

		if (this._visibility === visibility) return

		this._visibility = visibility
		this.touch()
	}

	createNewDraftRevision(): LorebookRevision {
		const draft = LorebookRevision.createDraft(this.nextRevisionNumber())
		this._revisions.set(draft.id.value, draft)
		this.touch()

		return draft
	}

	publishRevision(revisionId: LorebookRevisionId) {
		const revision = this.getRevision(revisionId)

		revision.publish()
		this.currentRevisionId = revisionId
		this.touch()
	}

	updateMetadata(name: string, description: string) {
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

	private touch() {
		this._updatedAt = new Date()
	}
}
