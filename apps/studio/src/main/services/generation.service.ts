import { OpenAICompatibleChatModel } from '@kirika-js/adapter-model-openai-compatible'
import { ChatEngine } from '@kirika-js/chat-engine'
import { CharacterId, CharacterRevisionId } from '@kirika-js/domain/character'
import {
  ConversationId,
  ConversationParticipantId,
} from '@kirika-js/domain/conversation'
import type { WebContents } from 'electron'
import type {
  AbortGenerationInput,
  GenerationEvent,
  GenerationMessageDto,
  StartGenerationInput,
  StartGenerationResult,
  StartTestGenerationInput,
} from '~/shared/ipc'
import { generationChannels } from '~/shared/ipc'
import {
  toConversationMessageDto,
  toMessageContentPartDto,
  toParticipantDto,
} from '../mappers/ipc-dto.mapper'
import { studioRuntime } from '../studio-runtime'
import { SqliteCharacterContextResolver } from './character-context-resolver'
import { TestCharacterContextResolver } from './test-character-context-resolver'

const CHECKPOINT_INTERVAL_MS = 250
const CHECKPOINT_CHARACTER_COUNT = 512

interface Task {
  controller: AbortController
  owner: WebContents
  ownerId: number
  done: Promise<void>
  conversationId: string
}
class GenerationService {
  private readonly tasks = new Map<string, Task>()
  private readonly pendingAborts = new Set<string>()
  start(
    input: StartGenerationInput,
    owner: WebContents,
  ): Promise<StartGenerationResult> {
    return this.startInternal(input, owner)
  }
  async startTest(
    input: StartTestGenerationInput,
    owner: WebContents,
  ): Promise<StartGenerationResult> {
    return this.startInternal(input, owner, input.contextOverride)
  }
  private sendPreparing(
    owner: WebContents,
    requestId: string,
    stage: Extract<GenerationEvent, { type: 'preparing' }>['stage'],
  ) {
    if (!owner.isDestroyed())
      owner.send(generationChannels.event, {
        type: 'preparing',
        requestId,
        messageId: '',
        stage,
      } satisfies GenerationEvent)
  }
  private async startInternal(
    input: StartGenerationInput,
    owner: WebContents,
    contextOverride?: StartTestGenerationInput['contextOverride'],
  ): Promise<StartGenerationResult> {
    const requestId = input.requestId
    this.sendPreparing(owner, requestId, 'provider')
    const runtime = studioRuntime.requireActive()
    const stored = runtime.settings.getProvider(input.providerId)
    if (!stored?.enabled) throw new Error('Provider 不存在或未启用')
    const apiKey = await runtime.settings.getProviderApiKey(stored.id)
    if (
      [...this.tasks.values()].some(
        (t) => t.conversationId === input.conversationId,
      )
    )
      throw new Error('该会话已有生成任务')
    this.sendPreparing(owner, requestId, 'conversation')
    const conversation = await runtime.conversationRepository.findById(
      new ConversationId(input.conversationId),
    )
    if (!conversation) throw new Error('会话不存在')
    if (!contextOverride) {
      for (const participant of conversation.activeParticipants) {
        if (participant.type !== 'character') continue
        const character = await runtime.characterRepository.findById(
          new CharacterId(participant.characterId?.value ?? ''),
        )
        const revision = character?.findRevision(
          new CharacterRevisionId(participant.characterRevisionId?.value ?? ''),
        )
        if (!revision || revision.isDraft)
          throw new Error('正式生成只能使用已发布角色版本')
      }
    }
    if ('characterId' in input && 'characterRevisionId' in input) {
      const speaker = conversation.activeParticipants.find(
        (participant) => participant.type === 'character',
      )
      if (
        !speaker ||
        speaker.characterId?.value !== input.characterId ||
        speaker.characterRevisionId?.value !== input.characterRevisionId
      )
        throw new Error('测试会话角色或精确版本与请求不一致')
    }
    this.sendPreparing(owner, requestId, 'history')
    const history = conversation.activeLeafMessageId
      ? await runtime.messageRepository.findPathToRoot(
          conversation.id,
          conversation.activeLeafMessageId,
        )
      : []
    this.sendPreparing(owner, requestId, 'context')
    if (this.tasks.has(requestId)) throw new Error('生成请求 ID 已存在')
    const controller = new AbortController()
    if (this.pendingAborts.delete(requestId)) controller.abort()
    const engine = new ChatEngine({
      model: new OpenAICompatibleChatModel({
        baseUrl: stored.baseUrl,
        apiKey,
      }),
      characterContextResolver: contextOverride
        ? new TestCharacterContextResolver(runtime, contextOverride)
        : new SqliteCharacterContextResolver(runtime),
    })
    const done = this.consume(
      requestId,
      owner,
      runtime,
      conversation,
      history,
      engine,
      input,
      stored.defaultModel,
      stored.generation,
      controller.signal,
    ).finally(() => this.tasks.delete(requestId))
    this.tasks.set(requestId, {
      controller,
      owner,
      ownerId: owner.id,
      done,
      conversationId: input.conversationId,
    })
    return { requestId }
  }
  async abort(input: AbortGenerationInput, owner?: WebContents): Promise<void> {
    const task = this.tasks.get(input.requestId)
    if (!task) {
      this.pendingAborts.add(input.requestId)
      return
    }
    if (owner && task.ownerId !== owner.id)
      throw new Error('不能取消其他窗口的生成任务')
    task.controller.abort()
  }
  async abortByOwner(owner: WebContents | number): Promise<void> {
    const ownerId = typeof owner === 'number' ? owner : owner.id
    await Promise.all(
      [...this.tasks.entries()]
        .filter(([, task]) => task.ownerId === ownerId)
        .map(([id]) => this.abort({ requestId: id })),
    )
  }
  async abortAll(): Promise<void> {
    await Promise.all(
      [...this.tasks.keys()].map((requestId) => this.abort({ requestId })),
    )
  }
  private async consume(
    requestId: string,
    owner: WebContents,
    runtime: ReturnType<typeof studioRuntime.requireActive>,
    conversation: NonNullable<
      Awaited<
        ReturnType<
          ReturnType<
            typeof studioRuntime.requireActive
          >['conversationRepository']['findById']
        >
      >
    >,
    history: Awaited<
      ReturnType<
        ReturnType<
          typeof studioRuntime.requireActive
        >['messageRepository']['findPathToRoot']
      >
    >,
    engine: ChatEngine,
    input: StartGenerationInput,
    defaultModel: string,
    defaults: StartGenerationInput['generation'],
    signal: AbortSignal,
  ) {
    let lastCheckpointAt = Date.now()
    let charactersSinceCheckpoint = 0
    try {
      for await (const event of engine.generateTurn({
        conversation,
        history,
        model: input.model ?? defaultModel,
        speakerParticipantId: input.speakerParticipantId
          ? new ConversationParticipantId(input.speakerParticipantId)
          : undefined,
        generation: { ...defaults, ...input.generation },
        signal,
      })) {
        if (event.type === 'started') {
          if (!owner.isDestroyed())
            owner.send(generationChannels.event, {
              type: 'started',
              requestId,
              messageId: event.message.id.value,
              speaker: toParticipantDto(event.speaker),
              request: {
                model: event.request.model,
                messages: event.request.messages.map(
                  (message) =>
                    ({
                      role: message.role,
                      name: message.name,
                      content: message.content.map(toMessageContentPartDto),
                    }) as GenerationMessageDto,
                ),
                maxOutputTokens: event.request.maxOutputTokens,
                temperature: event.request.temperature,
                topP: event.request.topP,
                stopSequences: event.request.stopSequences,
                seed: event.request.seed,
              },
            } satisfies GenerationEvent)
          await runtime.conversationUnitOfWork.startGeneration(
            conversation,
            event.message,
          )
        } else if (
          event.type === 'text_delta' ||
          event.type === 'content_part'
        ) {
          charactersSinceCheckpoint +=
            event.type === 'text_delta' ? event.delta.length : 1
          if (
            Date.now() - lastCheckpointAt >= CHECKPOINT_INTERVAL_MS ||
            charactersSinceCheckpoint >= CHECKPOINT_CHARACTER_COUNT
          ) {
            await runtime.conversationUnitOfWork.checkpointGeneration(
              event.message,
            )
            lastCheckpointAt = Date.now()
            charactersSinceCheckpoint = 0
          }
        } else {
          await runtime.conversationUnitOfWork.finishGeneration(
            conversation,
            event.message,
          )
        }
        let payload: GenerationEvent
        if (event.type === 'started')
          payload = {
            type: 'started',
            requestId,
            messageId: event.message.id.value,
            speaker: toParticipantDto(event.speaker),
            request: {
              model: event.request.model,
              messages: event.request.messages.map(
                (m) =>
                  ({
                    role: m.role,
                    name: m.name,
                    content: m.content.map(toMessageContentPartDto),
                  }) as GenerationMessageDto,
              ),
              maxOutputTokens: event.request.maxOutputTokens,
              temperature: event.request.temperature,
              topP: event.request.topP,
              stopSequences: event.request.stopSequences,
              seed: event.request.seed,
            },
          }
        else if (event.type === 'text_delta')
          payload = {
            type: 'text_delta',
            requestId,
            messageId: event.message.id.value,
            delta: event.delta,
          }
        else if (event.type === 'content_part')
          payload = {
            type: 'content_part',
            requestId,
            messageId: event.message.id.value,
            part: toMessageContentPartDto(event.part),
          }
        else if (event.type === 'completed')
          payload = {
            type: 'completed',
            requestId,
            messageId: event.message.id.value,
            finishReason: event.finishReason as 'stop' | 'length',
            tokenUsage: event.tokenUsage
              ? {
                  promptTokens: event.tokenUsage.promptTokens,
                  completionTokens: event.tokenUsage.completionTokens,
                  totalTokens: event.tokenUsage.totalTokens,
                }
              : null,
            message: toConversationMessageDto(event.message),
          }
        else if (event.type === 'failed')
          payload = {
            type: 'failed',
            requestId,
            messageId: event.message.id.value,
            reason: event.reason,
            message: toConversationMessageDto(event.message),
          }
        else
          payload = {
            type: 'cancelled',
            requestId,
            messageId: event.message.id.value,
            message: toConversationMessageDto(event.message),
          }
        if (event.type !== 'started' && !owner.isDestroyed())
          owner.send(generationChannels.event, payload)
      }
    } catch (error) {
      const activeId = conversation.activeGenerationMessageId
      const message = activeId
        ? await runtime.messageRepository.findById(activeId)
        : null
      const reason = error instanceof Error ? error.message : String(error)
      if (message?.isInProgress) {
        conversation.failGeneratedMessage(message, reason)
        await runtime.conversationUnitOfWork.finishGeneration(
          conversation,
          message,
        )
      }
      if (!owner.isDestroyed())
        owner.send(generationChannels.event, {
          type: 'failed',
          requestId,
          messageId: activeId?.value ?? '',
          reason,
          message: message ? toConversationMessageDto(message) : undefined,
        })
    }
  }
}
export const generationService = new GenerationService()
