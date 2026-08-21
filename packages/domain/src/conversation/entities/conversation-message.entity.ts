import { AggregateRoot } from '../../shared/aggregate-root.entity'
import { UuidId } from '../../shared/uuid-id.vo'
import type { ConversationId } from './conversation.entity'
import type { ConversationParticipantId } from './conversation-participant.entity'
import { MessageContent, type MessageContentPart } from './message-content.vo'
import type { TokenUsage } from './token-usage.vo'

export const CONVERSATION_MESSAGE_SOURCES = [
	'human',
	'greeting',
	'generated',
] as const
export type ConversationMessageSource =
	(typeof CONVERSATION_MESSAGE_SOURCES)[number]

export const CONVERSATION_MESSAGE_STATUSES = [
	'pending',
	'streaming',
	'completed',
	'failed',
	'cancelled',
] as const
export type ConversationMessageStatus =
	(typeof CONVERSATION_MESSAGE_STATUSES)[number]

export const GENERATION_FINISH_REASONS = [
	'stop',
	'length',
	'content_filter',
	'error',
	'cancelled',
] as const
export type GenerationFinishReason = (typeof GENERATION_FINISH_REASONS)[number]

export class ConversationMessageId extends UuidId {}

interface CreateMessageProps {
	conversationId: ConversationId
	parentMessageId: ConversationMessageId | null
	authorParticipantId: ConversationParticipantId
}

export interface CreateHumanMessageProps extends CreateMessageProps {
	content: MessageContent
}

export interface CreateGreetingMessageProps extends CreateMessageProps {
	content: MessageContent
}

export interface CreateGeneratedMessageProps extends CreateMessageProps {
	model: string
}

export interface ReconstituteConversationMessageProps {
	id: ConversationMessageId
	conversationId: ConversationId
	parentMessageId: ConversationMessageId | null
	authorParticipantId: ConversationParticipantId
	source: ConversationMessageSource
	status: ConversationMessageStatus
	content: MessageContent
	model: string | null
	finishReason: GenerationFinishReason | null
	tokenUsage: TokenUsage | null
	errorReason: string | null
	createdAt: Date
	updatedAt: Date
}

export class ConversationMessage extends AggregateRoot<ConversationMessageId> {
	private constructor(
		id: ConversationMessageId,
		readonly conversationId: ConversationId,
		readonly parentMessageId: ConversationMessageId | null,
		readonly authorParticipantId: ConversationParticipantId,
		readonly source: ConversationMessageSource,
		private _status: ConversationMessageStatus,
		private _content: MessageContent,
		private readonly _model: string | null,
		private _finishReason: GenerationFinishReason | null,
		private _tokenUsage: TokenUsage | null,
		private _errorReason: string | null,
		private readonly _createdAt: Date,
		private _updatedAt: Date,
	) {
		super(id)

		this._model = ConversationMessage.normalizeOptionalText(_model)
		this._errorReason = ConversationMessage.normalizeOptionalText(_errorReason)
		this._createdAt = new Date(_createdAt)
		this._updatedAt = new Date(_updatedAt)
		this.assertValidState()
	}

	get status(): ConversationMessageStatus {
		return this._status
	}

	get content(): MessageContent {
		return this._content
	}

	get model(): string | null {
		return this._model
	}

	get finishReason(): GenerationFinishReason | null {
		return this._finishReason
	}

	get tokenUsage(): TokenUsage | null {
		return this._tokenUsage
	}

	get errorReason(): string | null {
		return this._errorReason
	}

	get createdAt(): Date {
		return new Date(this._createdAt)
	}

	get updatedAt(): Date {
		return new Date(this._updatedAt)
	}

	get isInProgress(): boolean {
		return this._status === 'pending' || this._status === 'streaming'
	}

	get isTerminal(): boolean {
		return !this.isInProgress
	}

	static createHuman(props: CreateHumanMessageProps): ConversationMessage {
		return ConversationMessage.createCompletedMessage(props, 'human')
	}

	static createGreeting(
		props: CreateGreetingMessageProps,
	): ConversationMessage {
		return ConversationMessage.createCompletedMessage(props, 'greeting')
	}

	static createGenerated(
		props: CreateGeneratedMessageProps,
	): ConversationMessage {
		const now = new Date()
		return new ConversationMessage(
			ConversationMessageId.generate(),
			props.conversationId,
			props.parentMessageId,
			props.authorParticipantId,
			'generated',
			'pending',
			MessageContent.empty(),
			ConversationMessage.requireText(props.model, '生成模型不能为空'),
			null,
			null,
			null,
			now,
			now,
		)
	}

	static reconstitute(
		props: ReconstituteConversationMessageProps,
	): ConversationMessage {
		return new ConversationMessage(
			props.id,
			props.conversationId,
			props.parentMessageId,
			props.authorParticipantId,
			props.source,
			props.status,
			props.content,
			props.model,
			props.finishReason,
			props.tokenUsage,
			props.errorReason,
			props.createdAt,
			props.updatedAt,
		)
	}

	appendTextDelta(delta: string): void {
		this.ensureGenerationInProgress()
		if (!delta) return

		this._content = this._content.appendText(delta)
		this._status = 'streaming'
		this.touch()
	}

	appendContentPart(part: MessageContentPart): void {
		this.ensureGenerationInProgress()

		this._content = this._content.appendPart(part)
		this._status = 'streaming'
		this.touch()
	}

	complete(
		finishReason: Exclude<GenerationFinishReason, 'error' | 'cancelled'>,
		tokenUsage: TokenUsage | null = null,
	): void {
		this.ensureGenerationInProgress()
		ConversationMessage.requireContent(this._content)

		this._status = 'completed'
		this._finishReason = finishReason
		this._tokenUsage = tokenUsage
		this._errorReason = null
		this.touch()
	}

	fail(reason: string): void {
		this.ensureGenerationInProgress()

		this._status = 'failed'
		this._finishReason = 'error'
		this._tokenUsage = null
		this._errorReason = ConversationMessage.requireText(
			reason,
			'生成失败原因不能为空',
		)
		this.touch()
	}

	cancel(): void {
		this.ensureGenerationInProgress()

		this._status = 'cancelled'
		this._finishReason = 'cancelled'
		this._tokenUsage = null
		this._errorReason = null
		this.touch()
	}

	private static createCompletedMessage(
		props: CreateHumanMessageProps | CreateGreetingMessageProps,
		source: 'human' | 'greeting',
	): ConversationMessage {
		const now = new Date()
		return new ConversationMessage(
			ConversationMessageId.generate(),
			props.conversationId,
			props.parentMessageId,
			props.authorParticipantId,
			source,
			'completed',
			ConversationMessage.requireContent(props.content),
			null,
			null,
			null,
			null,
			now,
			now,
		)
	}

	private assertValidState(): void {
		if (this._updatedAt < this._createdAt) {
			throw new Error('消息更新时间不能早于创建时间')
		}

		if (this.source !== 'generated') {
			ConversationMessage.requireContent(this._content)
			if (
				this._status !== 'completed' ||
				this._model !== null ||
				this._finishReason !== null ||
				this._tokenUsage !== null ||
				this._errorReason !== null
			) {
				throw new Error('人工消息和角色问候语不能包含模型生成状态')
			}
			return
		}

		if (!this._model) throw new Error('生成消息必须记录模型')

		switch (this._status) {
			case 'pending':
			case 'streaming':
				if (
					this._finishReason !== null ||
					this._tokenUsage !== null ||
					this._errorReason !== null
				) {
					throw new Error('生成中的消息不能包含完成信息')
				}
				break
			case 'completed':
				ConversationMessage.requireContent(this._content)
				if (
					!this._finishReason ||
					this._finishReason === 'error' ||
					this._finishReason === 'cancelled' ||
					this._errorReason !== null
				) {
					throw new Error('已完成的生成消息缺少有效的生成结果')
				}
				break
			case 'failed':
				if (
					this._finishReason !== 'error' ||
					!this._errorReason ||
					this._tokenUsage !== null
				) {
					throw new Error('失败的生成消息缺少错误信息')
				}
				break
			case 'cancelled':
				if (
					this._finishReason !== 'cancelled' ||
					this._tokenUsage !== null ||
					this._errorReason !== null
				) {
					throw new Error('已取消的生成消息状态无效')
				}
				break
		}
	}

	private ensureGenerationInProgress(): void {
		if (this.source !== 'generated' || !this.isInProgress) {
			throw new Error('只有生成中的消息可以执行该操作')
		}
	}

	private touch(): void {
		this._updatedAt = new Date()
	}

	private static requireContent(content: MessageContent): MessageContent {
		if (content.isEmpty) throw new Error('消息内容不能为空')
		return content
	}

	private static requireText(value: string, message: string): string {
		const normalized = value.trim()
		if (!normalized) throw new Error(message)
		return normalized
	}

	private static normalizeOptionalText(value: string | null): string | null {
		const normalized = value?.trim() ?? ''
		return normalized || null
	}
}
