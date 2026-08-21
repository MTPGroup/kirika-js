import { UserId } from '~/auth/user-id.vo'
import { AggregateRoot } from '~/shared/domain/aggregate-root.entity'
import { UuidId } from '~/shared/domain/uuid-id.vo'
import { CharacterRevisionAsset } from './assets.entity'
import { CharacterLorebookReference } from './character-lorebook-reference.vo'
import {
	CharacterRevision,
	CharacterRevisionContent,
	CharacterRevisionId,
	CharacterRevisionPatch,
} from './character-revision.entity'

export class CharacterId extends UuidId {}

export interface CreateCharacterProps {
	ownerId: UserId
	alias?: string | null
	initialRevision: CharacterRevisionContent
}

export interface ReconstituteCharacterProps {
	id: CharacterId
	ownerId: UserId
	alias: string | null
	currentRevisionId: CharacterRevisionId | null
	revisions: CharacterRevision[]
	createdAt: Date
	updatedAt: Date
}

export class Character extends AggregateRoot<CharacterId> {
	private readonly _revisions: Map<string, CharacterRevision>

	private constructor(
		id: CharacterId,
		readonly ownerId: UserId,
		private _alias: string | null,
		private _currentRevisionId: CharacterRevisionId | null,
		revisions: CharacterRevision[],
		private readonly _createdAt: Date,
		private _updatedAt: Date,
	) {
		super(id)

		this._alias = Character.normalizeAlias(_alias)
		this._revisions = new Map(
			revisions.map((revision) => [revision.id.value, revision]),
		)
		this._createdAt = new Date(_createdAt)
		this._updatedAt = new Date(_updatedAt)
		this.assertValidRevisionState()
	}

	get alias(): string | null {
		return this._alias
	}

	get revisions(): readonly CharacterRevision[] {
		return Array.from(this._revisions.values())
	}

	get currentRevision(): CharacterRevision | null {
		if (!this._currentRevisionId) return null
		return this.findRevision(this._currentRevisionId)
	}

	get draftRevision(): CharacterRevision | null {
		return this.revisions.find((revision) => revision.isDraft) ?? null
	}

	get createdAt(): Date {
		return new Date(this._createdAt)
	}

	get updatedAt(): Date {
		return new Date(this._updatedAt)
	}

	static create(props: CreateCharacterProps): Character {
		const now = new Date()
		const initialDraft = CharacterRevision.createDraft(1, props.initialRevision)

		return new Character(
			CharacterId.generate(),
			props.ownerId,
			props.alias ?? null,
			null,
			[initialDraft],
			now,
			now,
		)
	}

	static reconstitute(props: ReconstituteCharacterProps): Character {
		return new Character(
			props.id,
			props.ownerId,
			props.alias,
			props.currentRevisionId,
			props.revisions,
			props.createdAt,
			props.updatedAt,
		)
	}

	findRevision(revisionId: CharacterRevisionId): CharacterRevision | null {
		return this._revisions.get(revisionId.value) ?? null
	}

	changeAlias(alias: string | null): void {
		const normalizedAlias = Character.normalizeAlias(alias)
		if (normalizedAlias === this._alias) return

		this._alias = normalizedAlias
		this.touch()
	}

	createNewDraftRevision(): CharacterRevision {
		if (this.draftRevision) {
			throw new Error('该角色已存在草稿版本')
		}

		const currentRevision = this.currentRevision
		if (!currentRevision) {
			throw new Error('角色没有可用于创建草稿的已发布版本')
		}

		const draft = currentRevision.cloneAsDraft(this.nextRevisionNumber())
		this._revisions.set(draft.id.value, draft)
		this.touch()

		return draft
	}

	updateDraftContent(
		revisionId: CharacterRevisionId,
		patch: CharacterRevisionPatch,
	): void {
		this.getRevision(revisionId).updateContent(patch)
		this.touch()
	}

	replaceDraftRevision(
		revisionId: CharacterRevisionId,
		content: CharacterRevisionContent,
	): void {
		this.getRevision(revisionId).replaceContent(content)
		this.touch()
	}

	replaceDraftGreetings(
		revisionId: CharacterRevisionId,
		greetings: readonly string[],
	): void {
		this.getRevision(revisionId).replaceGreetings(greetings)
		this.touch()
	}

	replaceDraftExamples(
		revisionId: CharacterRevisionId,
		examples: readonly string[],
	): void {
		this.getRevision(revisionId).replaceExamples(examples)
		this.touch()
	}

	replaceDraftAssets(
		revisionId: CharacterRevisionId,
		assets: readonly CharacterRevisionAsset[],
	): void {
		this.getRevision(revisionId).replaceAssets(assets)
		this.touch()
	}

	replaceDraftLorebooks(
		revisionId: CharacterRevisionId,
		lorebooks: readonly CharacterLorebookReference[],
	): void {
		this.getRevision(revisionId).replaceLorebooks(lorebooks)
		this.touch()
	}

	publishRevision(revisionId: CharacterRevisionId): void {
		const revision = this.getRevision(revisionId)
		revision.publish()
		this._currentRevisionId = revision.id
		this.touch()
	}

	private getRevision(revisionId: CharacterRevisionId): CharacterRevision {
		const revision = this.findRevision(revisionId)
		if (!revision) {
			throw new Error(`未找到 ${revisionId.value} 对应的角色版本`)
		}

		return revision
	}

	private nextRevisionNumber(): number {
		return (
			this.revisions.reduce(
				(max, revision) => Math.max(max, revision.revisionNumber),
				0,
			) + 1
		)
	}

	private assertValidRevisionState(): void {
		const revisionNumbers = new Set<number>()
		let draftCount = 0

		for (const revision of this._revisions.values()) {
			if (revisionNumbers.has(revision.revisionNumber)) {
				throw new Error(`角色版本号重复: ${revision.revisionNumber}`)
			}
			revisionNumbers.add(revision.revisionNumber)
			if (revision.isDraft) draftCount += 1
		}

		if (draftCount > 1) throw new Error('角色最多只能存在一个草稿版本')

		if (this._currentRevisionId) {
			const currentRevision = this.findRevision(this._currentRevisionId)
			if (!currentRevision) {
				throw new Error('当前角色版本不属于该角色')
			}
			if (currentRevision.isDraft) {
				throw new Error('当前角色版本不能指向草稿')
			}
		}
	}

	private touch(): void {
		this._updatedAt = new Date()
	}

	private static normalizeAlias(alias: string | null): string | null {
		const normalized = alias?.trim() ?? ''
		return normalized || null
	}
}
