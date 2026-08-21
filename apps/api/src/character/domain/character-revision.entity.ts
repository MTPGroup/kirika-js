import { Entity } from '~/shared/domain/base.entity'
import { UuidId } from '~/shared/domain/uuid-id.vo'
import { CharacterRevisionAsset } from './assets.entity'
import { CharacterLorebookReference } from './character-lorebook-reference.vo'

export class CharacterRevisionId extends UuidId {}

export interface CharacterRevisionContent {
	name: string
	description?: string
	personality?: string
	scenario?: string
	systemPrompt?: string
	postHistoryInstructions?: string
	greetings?: readonly string[]
	examples?: readonly string[]
	extensions?: Readonly<Record<string, unknown>>
	assets?: readonly CharacterRevisionAsset[]
	lorebooks?: readonly CharacterLorebookReference[]
}

export interface CharacterRevisionPatch {
	name?: string
	description?: string
	personality?: string
	scenario?: string
	systemPrompt?: string
	postHistoryInstructions?: string
	extensions?: Readonly<Record<string, unknown>>
}

export interface ReconstituteCharacterRevisionProps
	extends CharacterRevisionContent {
	id: CharacterRevisionId
	revisionNumber: number
	isDraft: boolean
	createdAt: Date
	updatedAt: Date
}

export class CharacterRevision extends Entity<CharacterRevisionId> {
	private constructor(
		id: CharacterRevisionId,
		readonly revisionNumber: number,
		private _isDraft: boolean,
		private _name: string,
		private _description: string,
		private _personality: string,
		private _scenario: string,
		private _systemPrompt: string,
		private _postHistoryInstructions: string,
		private _greetings: string[],
		private _examples: string[],
		private _extensions: Readonly<Record<string, unknown>>,
		private _assets: CharacterRevisionAsset[],
		private _lorebooks: CharacterLorebookReference[],
		private readonly _createdAt: Date,
		private _updatedAt: Date,
	) {
		super(id)

		if (!Number.isInteger(revisionNumber) || revisionNumber < 1) {
			throw new Error('角色版本号必须是大于等于 1 的整数')
		}
		if (!_name.trim()) throw new Error('角色名称不能为空')

		this._name = _name.trim()
		this._greetings = CharacterRevision.normalizeTextList(_greetings)
		this._examples = CharacterRevision.normalizeTextList(_examples)
		this._extensions = structuredClone(_extensions)
		this._assets = CharacterRevision.validateAssets(_assets)
		this._lorebooks = CharacterRevision.validateLorebooks(_lorebooks)
		this._createdAt = new Date(_createdAt)
		this._updatedAt = new Date(_updatedAt)
	}

	get isDraft(): boolean {
		return this._isDraft
	}

	get name(): string {
		return this._name
	}

	get description(): string {
		return this._description
	}

	get personality(): string {
		return this._personality
	}

	get scenario(): string {
		return this._scenario
	}

	get systemPrompt(): string {
		return this._systemPrompt
	}

	get postHistoryInstructions(): string {
		return this._postHistoryInstructions
	}

	get greetings(): readonly string[] {
		return [...this._greetings]
	}

	get examples(): readonly string[] {
		return [...this._examples]
	}

	get extensions(): Readonly<Record<string, unknown>> {
		return structuredClone(this._extensions)
	}

	get assets(): readonly CharacterRevisionAsset[] {
		return this._assets.map((asset) => asset.clone())
	}

	get lorebooks(): readonly CharacterLorebookReference[] {
		return this._lorebooks.map((reference) => reference.clone())
	}

	get createdAt(): Date {
		return new Date(this._createdAt)
	}

	get updatedAt(): Date {
		return new Date(this._updatedAt)
	}

	static createDraft(
		revisionNumber: number,
		content: CharacterRevisionContent,
	): CharacterRevision {
		const now = new Date()

		return new CharacterRevision(
			CharacterRevisionId.generate(),
			revisionNumber,
			true,
			content.name,
			content.description ?? '',
			content.personality ?? '',
			content.scenario ?? '',
			content.systemPrompt ?? '',
			content.postHistoryInstructions ?? '',
			[...(content.greetings ?? [])],
			[...(content.examples ?? [])],
			content.extensions ?? {},
			[...(content.assets ?? [])],
			[...(content.lorebooks ?? [])],
			now,
			now,
		)
	}

	static reconstitute(
		props: ReconstituteCharacterRevisionProps,
	): CharacterRevision {
		return new CharacterRevision(
			props.id,
			props.revisionNumber,
			props.isDraft,
			props.name,
			props.description ?? '',
			props.personality ?? '',
			props.scenario ?? '',
			props.systemPrompt ?? '',
			props.postHistoryInstructions ?? '',
			[...(props.greetings ?? [])],
			[...(props.examples ?? [])],
			props.extensions ?? {},
			[...(props.assets ?? [])],
			[...(props.lorebooks ?? [])],
			props.createdAt,
			props.updatedAt,
		)
	}

	updateContent(patch: CharacterRevisionPatch): void {
		this.ensureDraft()

		if (patch.name !== undefined) {
			if (!patch.name.trim()) throw new Error('角色名称不能为空')
			this._name = patch.name.trim()
		}
		if (patch.description !== undefined) {
			this._description = patch.description
		}
		if (patch.personality !== undefined) {
			this._personality = patch.personality
		}
		if (patch.scenario !== undefined) {
			this._scenario = patch.scenario
		}
		if (patch.systemPrompt !== undefined) {
			this._systemPrompt = patch.systemPrompt
		}
		if (patch.postHistoryInstructions !== undefined) {
			this._postHistoryInstructions = patch.postHistoryInstructions
		}
		if (patch.extensions !== undefined) {
			this._extensions = structuredClone(patch.extensions)
		}

		this.touch()
	}

	replaceGreetings(greetings: readonly string[]): void {
		this.ensureDraft()
		this._greetings = CharacterRevision.normalizeTextList(greetings)
		this.touch()
	}

	replaceExamples(examples: readonly string[]): void {
		this.ensureDraft()
		this._examples = CharacterRevision.normalizeTextList(examples)
		this.touch()
	}

	replaceAssets(assets: readonly CharacterRevisionAsset[]): void {
		this.ensureDraft()
		this._assets = CharacterRevision.validateAssets(assets)
		this.touch()
	}

	replaceLorebooks(lorebooks: readonly CharacterLorebookReference[]): void {
		this.ensureDraft()
		this._lorebooks = CharacterRevision.validateLorebooks(lorebooks)
		this.touch()
	}

	publish(): void {
		this.ensureDraft()

		if (this._greetings.length === 0) {
			throw new Error('角色至少需要一条问候语才能发布')
		}

		this._isDraft = false
		this.touch()
	}

	cloneAsDraft(revisionNumber: number): CharacterRevision {
		return CharacterRevision.createDraft(revisionNumber, {
			name: this.name,
			description: this.description,
			personality: this.personality,
			scenario: this.scenario,
			systemPrompt: this.systemPrompt,
			postHistoryInstructions: this.postHistoryInstructions,
			greetings: this.greetings,
			examples: this.examples,
			extensions: this.extensions,
			assets: this.assets,
			lorebooks: this.lorebooks,
		})
	}

	private ensureDraft(): void {
		if (!this._isDraft) throw new Error('已发布的角色版本不能更改')
	}

	private touch(): void {
		this._updatedAt = new Date()
	}

	private static normalizeTextList(values: readonly string[]): string[] {
		return [...new Set(values.filter((value) => value.trim().length > 0))]
	}

	private static validateAssets(
		assets: readonly CharacterRevisionAsset[],
	): CharacterRevisionAsset[] {
		const keys = new Set<string>()

		for (const asset of assets) {
			const key = `${asset.kind}:${asset.ordinal}`
			if (keys.has(key)) {
				throw new Error(`角色资产位置重复: ${key}`)
			}
			keys.add(key)
		}

		return assets
			.map((asset) => asset.clone())
			.sort((a, b) => a.kind.localeCompare(b.kind) || a.ordinal - b.ordinal)
	}

	private static validateLorebooks(
		lorebooks: readonly CharacterLorebookReference[],
	): CharacterLorebookReference[] {
		const revisionIds = new Set<string>()
		const ordinals = new Set<number>()

		for (const reference of lorebooks) {
			const revisionId = reference.lorebookRevisionId.value
			if (revisionIds.has(revisionId)) {
				throw new Error(`世界书版本重复引用: ${revisionId}`)
			}
			if (ordinals.has(reference.ordinal)) {
				throw new Error(`世界书引用序号重复: ${reference.ordinal}`)
			}

			revisionIds.add(revisionId)
			ordinals.add(reference.ordinal)
		}

		return lorebooks
			.map((reference) => reference.clone())
			.sort((a, b) => a.ordinal - b.ordinal)
	}
}
