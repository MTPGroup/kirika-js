import { AggregateRoot } from '../../shared/aggregate-root.entity'
import type { UserId } from '../../shared/user-id.vo'
import { UuidId } from '../../shared/uuid-id.vo'
import {
	ConversationMessage,
	type ConversationMessageId,
	type GenerationFinishReason,
} from './conversation-message.entity'
import type {
	ConversationParticipant,
	ConversationParticipantId,
} from './conversation-participant.entity'
import type { MessageContent, MessageContentPart } from './message-content.vo'
import type { TokenUsage } from './token-usage.vo'

export const CONVERSATION_MODES = ['direct', 'group'] as const
export type ConversationMode = (typeof CONVERSATION_MODES)[number]

export const CONVERSATION_STATUSES = ['active', 'archived'] as const
export type ConversationStatus = (typeof CONVERSATION_STATUSES)[number]

export const CONVERSATION_TURN_POLICIES = [
	'manual',
	'round_robin',
	'auto',
] as const
export type ConversationTurnPolicy = (typeof CONVERSATION_TURN_POLICIES)[number]

export class ConversationId extends UuidId {}

export interface CreateConversationProps {
	ownerId: UserId
	mode: ConversationMode
	participants: ConversationParticipant[]
	title?: string | null
	turnPolicy?: ConversationTurnPolicy
}

export interface ReconstituteConversationProps {
	id: ConversationId
	ownerId: UserId
	mode: ConversationMode
	participants: ConversationParticipant[]
	title: string | null
	status: ConversationStatus
	turnPolicy: ConversationTurnPolicy
	activeLeafMessageId: ConversationMessageId | null
	activeGenerationMessageId: ConversationMessageId | null
	createdAt: Date
	updatedAt: Date
	archivedAt: Date | null
}

export class Conversation extends AggregateRoot<ConversationId> {
	private readonly _participants: Map<string, ConversationParticipant>

	private constructor(
		id: ConversationId,
		readonly ownerId: UserId,
		private _mode: ConversationMode,
		participants: ConversationParticipant[],
		private _title: string | null,
		private _status: ConversationStatus,
		private _turnPolicy: ConversationTurnPolicy,
		private _activeLeafMessageId: ConversationMessageId | null,
		private _activeGenerationMessageId: ConversationMessageId | null,
		private readonly _createdAt: Date,
		private _updatedAt: Date,
		private _archivedAt: Date | null,
	) {
		super(id)

		this._title = Conversation.normalizeTitle(_title)
		this._participants = new Map()
		for (const participant of participants) {
			if (this._participants.has(participant.id.value)) {
				throw new Error(`会话参与者 ID 重复: ${participant.id.value}`)
			}
			this._participants.set(participant.id.value, participant)
		}
		this._createdAt = new Date(_createdAt)
		this._updatedAt = new Date(_updatedAt)
		this._archivedAt = _archivedAt ? new Date(_archivedAt) : null
		this.assertValidState()
	}

	get mode(): ConversationMode {
		return this._mode
	}

	get title(): string | null {
		return this._title
	}

	get status(): ConversationStatus {
		return this._status
	}

	get turnPolicy(): ConversationTurnPolicy {
		return this._turnPolicy
	}

	get participants(): readonly ConversationParticipant[] {
		return [...this._participants.values()].sort(
			(a, b) =>
				a.joinedAt.getTime() - b.joinedAt.getTime() ||
				a.id.value.localeCompare(b.id.value),
		)
	}

	get activeParticipants(): readonly ConversationParticipant[] {
		return this.participants.filter((participant) => participant.isActive)
	}

	get activeLeafMessageId(): ConversationMessageId | null {
		return this._activeLeafMessageId
	}

	get activeGenerationMessageId(): ConversationMessageId | null {
		return this._activeGenerationMessageId
	}

	get createdAt(): Date {
		return new Date(this._createdAt)
	}

	get updatedAt(): Date {
		return new Date(this._updatedAt)
	}

	get archivedAt(): Date | null {
		return this._archivedAt ? new Date(this._archivedAt) : null
	}

	static create(props: CreateConversationProps): Conversation {
		const now = new Date()
		return new Conversation(
			ConversationId.generate(),
			props.ownerId,
			props.mode,
			props.participants,
			props.title ?? null,
			'active',
			props.turnPolicy ?? 'manual',
			null,
			null,
			now,
			now,
			null,
		)
	}

	static reconstitute(props: ReconstituteConversationProps): Conversation {
		return new Conversation(
			props.id,
			props.ownerId,
			props.mode,
			props.participants,
			props.title,
			props.status,
			props.turnPolicy,
			props.activeLeafMessageId,
			props.activeGenerationMessageId,
			props.createdAt,
			props.updatedAt,
			props.archivedAt,
		)
	}

	findParticipant(
		participantId: ConversationParticipantId,
	): ConversationParticipant | null {
		return this._participants.get(participantId.value) ?? null
	}

	rename(title: string | null): void {
		const normalized = Conversation.normalizeTitle(title)
		if (normalized === this._title) return

		this._title = normalized
		this.touch()
	}

	changeTurnPolicy(turnPolicy: ConversationTurnPolicy): void {
		this.ensureActive()
		if (turnPolicy === this._turnPolicy) return

		this._turnPolicy = turnPolicy
		this.touch()
	}

	convertToGroup(turnPolicy: ConversationTurnPolicy = 'manual'): void {
		this.ensureActive()
		this.ensureNoGenerationInProgress()
		if (this._mode === 'group') return

		this._mode = 'group'
		this._turnPolicy = turnPolicy
		this.touch()
	}

	addParticipant(participant: ConversationParticipant): void {
		this.ensureActive()
		this.ensureNoGenerationInProgress()
		if (this._mode !== 'group') {
			throw new Error('一对一会话需要先转换为群聊才能增加参与者')
		}
		if (participant.role === 'owner') {
			throw new Error('会话只能有一个所有者')
		}
		if (!participant.isActive) throw new Error('只能添加活跃参与者')
		if (this._participants.has(participant.id.value)) {
			throw new Error(`会话参与者 ID 重复: ${participant.id.value}`)
		}
		if (
			this.participants.some(
				(existing) => existing.referenceKey === participant.referenceKey,
			)
		) {
			throw new Error('同一用户或角色版本不能重复加入会话')
		}

		this._participants.set(participant.id.value, participant)
		this.touch()
	}

	removeParticipant(participantId: ConversationParticipantId): void {
		this.ensureActive()
		this.ensureNoGenerationInProgress()

		this.getParticipant(participantId).leave()
		this.touch()
	}

	renameParticipant(
		participantId: ConversationParticipantId,
		displayName: string,
	): void {
		this.ensureActive()
		const participant = this.getParticipant(participantId)
		if (!participant.isActive) throw new Error('不能修改已退出参与者')

		participant.rename(displayName)
		this.touch()
	}

	createHumanMessage(
		authorParticipantId: ConversationParticipantId,
		content: MessageContent,
		parentMessage: ConversationMessage | null,
	): ConversationMessage {
		this.prepareToCreateMessage(authorParticipantId, 'human', parentMessage)

		const message = ConversationMessage.createHuman({
			conversationId: this.id,
			parentMessageId: parentMessage?.id ?? null,
			authorParticipantId,
			content,
		})
		this.activateMessage(message)
		return message
	}

	createGreetingMessage(
		authorParticipantId: ConversationParticipantId,
		content: MessageContent,
		parentMessage: ConversationMessage | null,
	): ConversationMessage {
		this.prepareToCreateMessage(authorParticipantId, 'character', parentMessage)

		const message = ConversationMessage.createGreeting({
			conversationId: this.id,
			parentMessageId: parentMessage?.id ?? null,
			authorParticipantId,
			content,
		})
		this.activateMessage(message)
		return message
	}

	createGeneratedMessage(
		authorParticipantId: ConversationParticipantId,
		model: string,
		parentMessage: ConversationMessage | null,
	): ConversationMessage {
		this.prepareToCreateMessage(authorParticipantId, 'character', parentMessage)

		const message = ConversationMessage.createGenerated({
			conversationId: this.id,
			parentMessageId: parentMessage?.id ?? null,
			authorParticipantId,
			model,
		})
		this._activeGenerationMessageId = message.id
		this.activateMessage(message)
		return message
	}

	appendGeneratedTextDelta(message: ConversationMessage, delta: string): void {
		this.ensureTrackedGeneration(message)
		message.appendTextDelta(delta)
		this.touch()
	}

	appendGeneratedContentPart(
		message: ConversationMessage,
		part: MessageContentPart,
	): void {
		this.ensureTrackedGeneration(message)
		message.appendContentPart(part)
		this.touch()
	}

	completeGeneratedMessage(
		message: ConversationMessage,
		finishReason: Exclude<GenerationFinishReason, 'error' | 'cancelled'>,
		tokenUsage: TokenUsage | null = null,
	): void {
		this.ensureTrackedGeneration(message)
		message.complete(finishReason, tokenUsage)
		this.finishGeneration()
	}

	failGeneratedMessage(message: ConversationMessage, reason: string): void {
		this.ensureTrackedGeneration(message)
		message.fail(reason)
		this.finishGeneration()
	}

	cancelGeneratedMessage(message: ConversationMessage): void {
		this.ensureTrackedGeneration(message)
		message.cancel()
		this.finishGeneration()
	}

	selectMessageBranch(
		leafMessage: ConversationMessage,
		hasChildren: boolean,
	): void {
		this.ensureActive()
		this.ensureNoGenerationInProgress()
		this.ensureMessageBelongsToConversation(leafMessage)
		if (hasChildren) throw new Error('只能选择没有后续消息的叶子消息')
		if (leafMessage.isInProgress) throw new Error('不能选择生成中的消息分支')

		this._activeLeafMessageId = leafMessage.id
		this.touch()
	}

	archive(): void {
		if (this._status === 'archived') return
		this.ensureNoGenerationInProgress()

		this._status = 'archived'
		this._archivedAt = new Date()
		this.touch()
	}

	restore(): void {
		if (this._status === 'active') return

		this._status = 'active'
		this._archivedAt = null
		this.touch()
	}

	private prepareToCreateMessage(
		authorParticipantId: ConversationParticipantId,
		expectedType: 'human' | 'character',
		parentMessage: ConversationMessage | null,
	): void {
		this.ensureActive()
		this.ensureNoGenerationInProgress()
		this.ensureConversationCanChat()

		const author = this.getParticipant(authorParticipantId)
		if (!author.isActive) throw new Error('已退出的参与者不能发送消息')
		if (author.type !== expectedType) {
			throw new Error(
				expectedType === 'human'
					? '人工消息必须由人类参与者发送'
					: '角色消息必须由角色参与者发送',
			)
		}

		if (parentMessage) {
			this.ensureMessageBelongsToConversation(parentMessage)
			if (parentMessage.status !== 'completed') {
				throw new Error('新消息必须接在已完成的消息之后')
			}
		} else if (this._activeLeafMessageId) {
			throw new Error('非空会话的新消息必须指定父消息')
		}
	}

	private activateMessage(message: ConversationMessage): void {
		this._activeLeafMessageId = message.id
		this.touch()
	}

	private finishGeneration(): void {
		this._activeGenerationMessageId = null
		this.touch()
	}

	private getParticipant(
		participantId: ConversationParticipantId,
	): ConversationParticipant {
		const participant = this.findParticipant(participantId)
		if (!participant) {
			throw new Error(`会话参与者不存在: ${participantId.value}`)
		}
		return participant
	}

	private ensureTrackedGeneration(message: ConversationMessage): void {
		this.ensureActive()
		this.ensureMessageBelongsToConversation(message)
		if (!this._activeGenerationMessageId?.equals(message.id)) {
			throw new Error('该消息不是会话当前的生成任务')
		}
	}

	private ensureMessageBelongsToConversation(
		message: ConversationMessage,
	): void {
		if (!message.conversationId.equals(this.id)) {
			throw new Error('消息不属于当前会话')
		}
	}

	private ensureConversationCanChat(): void {
		if (this.activeParticipants.length < 2) {
			throw new Error('会话至少需要两个活跃参与者才能继续聊天')
		}
		if (
			!this.activeParticipants.some(
				(participant) => participant.type === 'character',
			)
		) {
			throw new Error('会话至少需要一个活跃角色参与者')
		}
	}

	private ensureActive(): void {
		if (this._status !== 'active') throw new Error('已归档的会话不能继续聊天')
	}

	private ensureNoGenerationInProgress(): void {
		if (this._activeGenerationMessageId) {
			throw new Error('会话中已有正在生成的消息')
		}
	}

	private assertValidState(): void {
		if (this._updatedAt < this._createdAt) {
			throw new Error('会话更新时间不能早于创建时间')
		}
		if (this._status === 'archived' && !this._archivedAt) {
			throw new Error('已归档会话必须记录归档时间')
		}
		if (this._status === 'active' && this._archivedAt) {
			throw new Error('活跃会话不能包含归档时间')
		}
		if (this._status === 'archived' && this._activeGenerationMessageId) {
			throw new Error('已归档会话不能包含生成中的消息')
		}
		if (
			this._activeGenerationMessageId &&
			!this._activeGenerationMessageId.equals(this._activeLeafMessageId)
		) {
			throw new Error('生成中的消息必须是当前活跃消息')
		}

		const referenceKeys = new Set<string>()
		const owners: ConversationParticipant[] = []
		for (const participant of this._participants.values()) {
			if (referenceKeys.has(participant.referenceKey)) {
				throw new Error('同一用户或角色版本不能重复加入会话')
			}
			referenceKeys.add(participant.referenceKey)
			if (participant.role === 'owner') owners.push(participant)
		}

		if (owners.length !== 1) throw new Error('会话必须且只能有一个所有者')
		if (
			owners[0].type !== 'human' ||
			!owners[0].userId?.equals(this.ownerId) ||
			!owners[0].isActive
		) {
			throw new Error('会话所有者必须是对应的活跃人类参与者')
		}

		const characterCount = this.participants.filter(
			(participant) => participant.type === 'character',
		).length
		if (characterCount === 0) throw new Error('会话至少需要一个角色参与者')

		if (this._mode === 'direct') {
			if (
				this._participants.size !== 2 ||
				characterCount !== 1 ||
				this.participants.filter((participant) => participant.type === 'human')
					.length !== 1
			) {
				throw new Error('一对一会话必须由一个人类和一个角色组成')
			}
		} else if (this._participants.size < 2) {
			throw new Error('群聊至少需要两个参与者')
		}
	}

	private touch(): void {
		this._updatedAt = new Date()
	}

	private static normalizeTitle(title: string | null): string | null {
		const normalized = title?.trim() ?? ''
		return normalized || null
	}
}
