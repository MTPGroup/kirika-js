import { UserId } from '~/auth/user-id.vo'
import { CharacterId } from '~/character/domain/character.entity'
import { CharacterRevisionId } from '~/character/domain/character-revision.entity'
import { Entity } from '~/shared/domain/base.entity'
import { UuidId } from '~/shared/domain/uuid-id.vo'

export const CONVERSATION_PARTICIPANT_TYPES = ['human', 'character'] as const
export type ConversationParticipantType =
	(typeof CONVERSATION_PARTICIPANT_TYPES)[number]

export const CONVERSATION_PARTICIPANT_ROLES = ['owner', 'member'] as const
export type ConversationParticipantRole =
	(typeof CONVERSATION_PARTICIPANT_ROLES)[number]

export const CONVERSATION_PARTICIPANT_STATUSES = ['active', 'left'] as const
export type ConversationParticipantStatus =
	(typeof CONVERSATION_PARTICIPANT_STATUSES)[number]

export class ConversationParticipantId extends UuidId {}

export interface CreateHumanParticipantProps {
	userId: UserId
	displayName: string
	role?: ConversationParticipantRole
}

export interface CreateCharacterParticipantProps {
	characterId: CharacterId
	characterRevisionId: CharacterRevisionId
	displayName: string
}

export interface ReconstituteConversationParticipantProps {
	id: ConversationParticipantId
	type: ConversationParticipantType
	role: ConversationParticipantRole
	status: ConversationParticipantStatus
	userId: UserId | null
	characterId: CharacterId | null
	characterRevisionId: CharacterRevisionId | null
	displayName: string
	joinedAt: Date
	leftAt: Date | null
}

export class ConversationParticipant extends Entity<ConversationParticipantId> {
	private constructor(
		id: ConversationParticipantId,
		readonly type: ConversationParticipantType,
		readonly role: ConversationParticipantRole,
		private _status: ConversationParticipantStatus,
		readonly userId: UserId | null,
		readonly characterId: CharacterId | null,
		readonly characterRevisionId: CharacterRevisionId | null,
		private _displayName: string,
		private readonly _joinedAt: Date,
		private _leftAt: Date | null,
	) {
		super(id)

		this._displayName = ConversationParticipant.requireDisplayName(_displayName)
		this._joinedAt = new Date(_joinedAt)
		this._leftAt = _leftAt ? new Date(_leftAt) : null
		this.assertValidState()
	}

	get status(): ConversationParticipantStatus {
		return this._status
	}

	get displayName(): string {
		return this._displayName
	}

	get joinedAt(): Date {
		return new Date(this._joinedAt)
	}

	get leftAt(): Date | null {
		return this._leftAt ? new Date(this._leftAt) : null
	}

	get isActive(): boolean {
		return this._status === 'active'
	}

	get referenceKey(): string {
		return this.type === 'human'
			? `human:${this.userId?.value}`
			: `character:${this.characterRevisionId?.value}`
	}

	static createHuman(
		props: CreateHumanParticipantProps,
	): ConversationParticipant {
		const now = new Date()
		return new ConversationParticipant(
			ConversationParticipantId.generate(),
			'human',
			props.role ?? 'member',
			'active',
			props.userId,
			null,
			null,
			props.displayName,
			now,
			null,
		)
	}

	static createCharacter(
		props: CreateCharacterParticipantProps,
	): ConversationParticipant {
		const now = new Date()
		return new ConversationParticipant(
			ConversationParticipantId.generate(),
			'character',
			'member',
			'active',
			null,
			props.characterId,
			props.characterRevisionId,
			props.displayName,
			now,
			null,
		)
	}

	static reconstitute(
		props: ReconstituteConversationParticipantProps,
	): ConversationParticipant {
		return new ConversationParticipant(
			props.id,
			props.type,
			props.role,
			props.status,
			props.userId,
			props.characterId,
			props.characterRevisionId,
			props.displayName,
			props.joinedAt,
			props.leftAt,
		)
	}

	rename(displayName: string): void {
		this._displayName = ConversationParticipant.requireDisplayName(displayName)
	}

	leave(): void {
		if (this.role === 'owner') throw new Error('会话所有者不能退出会话')
		if (this._status === 'left') return

		this._status = 'left'
		this._leftAt = new Date()
	}

	private assertValidState(): void {
		if (this.type === 'human') {
			if (!this.userId || this.characterId || this.characterRevisionId) {
				throw new Error('人类参与者必须且只能关联用户')
			}
		} else {
			if (this.userId || !this.characterId || !this.characterRevisionId) {
				throw new Error('角色参与者必须关联角色及其固定版本')
			}
			if (this.role !== 'member') {
				throw new Error('角色参与者不能成为会话所有者')
			}
		}

		if (this._status === 'active' && this._leftAt) {
			throw new Error('活跃参与者不能包含退出时间')
		}
		if (this._status === 'left' && !this._leftAt) {
			throw new Error('已退出参与者必须记录退出时间')
		}
		if (this._leftAt && this._leftAt < this._joinedAt) {
			throw new Error('参与者退出时间不能早于加入时间')
		}
	}

	private static requireDisplayName(value: string): string {
		const normalized = value.trim()
		if (!normalized) throw new Error('参与者显示名称不能为空')
		return normalized
	}
}
