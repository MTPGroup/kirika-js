import type {
	AssetMessageContentPart,
	Conversation,
	ConversationMessage,
	ConversationParticipant,
	ConversationParticipantId,
	TokenUsage as DomainTokenUsage,
} from '@kirika-js/domain/conversation'
import { TokenUsage } from '@kirika-js/domain/conversation'
import {
	ChatCharacterContextNotFoundError,
	ChatGenerationAbortedError,
} from './errors'
import { validateChatHistory } from './history-validator'
import type {
	ChatGenerationConfig,
	ChatModelFinishReason,
	ChatModelRequest,
} from './model/chat-model'
import type { ChatCharacterContextResolverPort } from './ports/character-context-resolver.port'
import type { ChatModelPort } from './ports/chat-model.port'
import type { AutoSpeakerSelectorPort } from './ports/speaker-selector.port'
import { ChatPromptCompiler } from './prompt/chat-prompt-compiler'
import { ChatSpeakerSelector } from './speaker/chat-speaker-selector'

export interface GenerateChatTurnInput {
	readonly conversation: Conversation
	readonly history: readonly ConversationMessage[]
	readonly model: string
	readonly speakerParticipantId?: ConversationParticipantId
	readonly generation?: ChatGenerationConfig
	readonly defaultSystemPrompt?: string
	readonly defaultPostHistoryInstructions?: string
	readonly extraMacros?: Readonly<Record<string, string>>
	readonly signal?: AbortSignal
}

export interface ChatGenerationStartedEvent {
	readonly type: 'started'
	readonly message: ConversationMessage
	readonly speaker: ConversationParticipant
	readonly request: ChatModelRequest
}

export interface ChatTextDeltaEvent {
	readonly type: 'text_delta'
	readonly message: ConversationMessage
	readonly delta: string
}

export interface ChatContentPartEvent {
	readonly type: 'content_part'
	readonly message: ConversationMessage
	readonly part: AssetMessageContentPart
}

export interface ChatGenerationCompletedEvent {
	readonly type: 'completed'
	readonly message: ConversationMessage
	readonly finishReason: ChatModelFinishReason
	readonly tokenUsage: DomainTokenUsage | null
}

export interface ChatGenerationFailedEvent {
	readonly type: 'failed'
	readonly message: ConversationMessage
	readonly reason: string
	readonly error: unknown
}

export interface ChatGenerationCancelledEvent {
	readonly type: 'cancelled'
	readonly message: ConversationMessage
}

export type ChatTerminalEvent =
	| ChatGenerationCompletedEvent
	| ChatGenerationFailedEvent
	| ChatGenerationCancelledEvent

export type ChatEngineEvent =
	| ChatGenerationStartedEvent
	| ChatTextDeltaEvent
	| ChatContentPartEvent
	| ChatTerminalEvent

export interface ChatEngineDependencies {
	readonly model: ChatModelPort
	readonly characterContextResolver: ChatCharacterContextResolverPort
	readonly autoSpeakerSelector?: AutoSpeakerSelectorPort
	readonly promptCompiler?: ChatPromptCompiler
}

export class ChatEngine {
	private readonly speakerSelector: ChatSpeakerSelector
	private readonly promptCompiler: ChatPromptCompiler

	constructor(private readonly dependencies: ChatEngineDependencies) {
		this.speakerSelector = new ChatSpeakerSelector(
			dependencies.autoSpeakerSelector,
		)
		this.promptCompiler =
			dependencies.promptCompiler ?? new ChatPromptCompiler()
	}

	async *generateTurn(
		input: GenerateChatTurnInput,
	): AsyncGenerator<ChatEngineEvent, ChatTerminalEvent, void> {
		validateChatHistory(input.conversation, input.history)
		validateGenerationInput(input)
		if (input.signal?.aborted) throw new ChatGenerationAbortedError()

		const speaker = await this.speakerSelector.select({
			conversation: input.conversation,
			history: input.history,
			requestedSpeakerId: input.speakerParticipantId,
		})
		if (!speaker.characterId || !speaker.characterRevisionId) {
			throw new ChatCharacterContextNotFoundError('当前发言者没有绑定角色版本')
		}
		const character = await this.dependencies.characterContextResolver.resolve(
			speaker.characterId,
			speaker.characterRevisionId,
		)
		if (!character) {
			throw new ChatCharacterContextNotFoundError(
				`无法解析角色版本: ${speaker.characterRevisionId.value}`,
			)
		}

		const request: ChatModelRequest = {
			model: input.model.trim(),
			messages: this.promptCompiler.compile({
				conversation: input.conversation,
				history: input.history,
				speaker,
				character,
				defaultSystemPrompt: input.defaultSystemPrompt,
				defaultPostHistoryInstructions: input.defaultPostHistoryInstructions,
				extraMacros: input.extraMacros,
			}),
			...cloneGenerationConfig(input.generation),
		}
		const parentMessage = input.history.at(-1) ?? null
		const generated = input.conversation.createGeneratedMessage(
			speaker.id,
			request.model,
			parentMessage,
		)
		let terminalEvent: ChatTerminalEvent | null = null

		try {
			yield { type: 'started', message: generated, speaker, request }

			for await (const event of this.dependencies.model.generate(
				request,
				input.signal,
			)) {
				if (input.signal?.aborted) {
					terminalEvent = cancelGeneration(input.conversation, generated)
					yield terminalEvent
					return terminalEvent
				}

				switch (event.type) {
					case 'text_delta':
						if (!event.delta) break
						input.conversation.appendGeneratedTextDelta(generated, event.delta)
						yield {
							type: 'text_delta',
							message: generated,
							delta: event.delta,
						}
						break
					case 'content_part':
						input.conversation.appendGeneratedContentPart(generated, event.part)
						yield {
							type: 'content_part',
							message: generated,
							part: event.part,
						}
						break
					case 'finish': {
						switch (event.finishReason) {
							case 'stop':
							case 'length': {
								const tokenUsage = event.tokenUsage
									? new TokenUsage(event.tokenUsage)
									: null
								input.conversation.completeGeneratedMessage(
									generated,
									event.finishReason,
									tokenUsage,
								)
								terminalEvent = {
									type: 'completed',
									message: generated,
									finishReason: event.finishReason,
									tokenUsage,
								}
								yield terminalEvent
								return terminalEvent
							}
							case 'content_filter': {
								input.conversation.failGeneratedMessage(
									generated,
									'内容过滤导致生成终止',
								)
								terminalEvent = {
									type: 'failed',
									message: generated,
									reason: 'content_filter',
									error: null,
								}
								yield terminalEvent
								return terminalEvent
							}
							case 'tool_call': {
								throw new Error('暂时未实现工具调用功能')
							}
							case 'unknown': {
								throw new Error('未知的结束理由')
							}
						}
					}
				}
			}

			throw new Error('模型流在完成事件前结束')
		} catch (error) {
			if (!generated.isInProgress) throw error
			if (input.signal?.aborted) {
				terminalEvent = cancelGeneration(input.conversation, generated)
				yield terminalEvent
				return terminalEvent
			}

			const reason = errorMessage(error)
			input.conversation.failGeneratedMessage(generated, reason)
			terminalEvent = {
				type: 'failed',
				message: generated,
				reason,
				error,
			}
			yield terminalEvent
			return terminalEvent
		} finally {
			if (!terminalEvent && generated.isInProgress) {
				input.conversation.cancelGeneratedMessage(generated)
			}
		}
	}
}

function validateGenerationInput(input: GenerateChatTurnInput): void {
	if (!input.model.trim()) throw new Error('生成模型不能为空')
	const config = input.generation
	if (
		config?.maxOutputTokens !== undefined &&
		(!Number.isSafeInteger(config.maxOutputTokens) ||
			config.maxOutputTokens <= 0)
	) {
		throw new Error('maxOutputTokens 必须是正安全整数')
	}
	if (
		config?.temperature !== undefined &&
		(!Number.isFinite(config.temperature) || config.temperature < 0)
	) {
		throw new Error('temperature 必须是非负有限数值')
	}
	if (
		config?.topP !== undefined &&
		(!Number.isFinite(config.topP) || config.topP < 0 || config.topP > 1)
	) {
		throw new Error('topP 必须位于 0 到 1 之间')
	}
	if (config?.seed !== undefined && !Number.isSafeInteger(config.seed)) {
		throw new Error('seed 必须是安全整数')
	}
	if (config?.stopSequences?.some((sequence) => !sequence)) {
		throw new Error('stopSequences 不能包含空字符串')
	}
}

function cloneGenerationConfig(
	config: ChatGenerationConfig | undefined,
): ChatGenerationConfig {
	return {
		maxOutputTokens: config?.maxOutputTokens,
		temperature: config?.temperature,
		topP: config?.topP,
		stopSequences: config?.stopSequences
			? [...config.stopSequences]
			: undefined,
		seed: config?.seed,
		metadata: config?.metadata ? structuredClone(config.metadata) : undefined,
	}
}

function cancelGeneration(
	conversation: Conversation,
	message: ConversationMessage,
): ChatGenerationCancelledEvent {
	conversation.cancelGeneratedMessage(message)
	return { type: 'cancelled', message }
}

function errorMessage(error: unknown): string {
	if (error instanceof Error && error.message.trim())
		return error.message.trim()
	return '模型生成失败'
}
