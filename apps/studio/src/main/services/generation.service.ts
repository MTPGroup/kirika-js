import { randomUUID } from 'node:crypto'
import { OpenAICompatibleChatModel } from '@kirika-js/adapter-model-openai-compatible'
import { ChatEngine } from '@kirika-js/chat-engine'
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
} from '~/shared/ipc'
import { generationChannels } from '~/shared/ipc'
import {
  toConversationMessageDto,
  toMessageContentPartDto,
  toParticipantDto,
} from '../mappers/ipc-dto.mapper'
import { studioRuntime } from '../studio-runtime'
import { SqliteCharacterContextResolver } from './character-context-resolver'

interface Task {
  controller: AbortController
  owner: WebContents
  done: Promise<void>
  conversationId: string
}
class GenerationService {
  private readonly tasks = new Map<string, Task>()
  async start(
    input: StartGenerationInput,
    owner: WebContents,
  ): Promise<StartGenerationResult> {
    const runtime = studioRuntime.requireActive()
    const stored = runtime.settings.getProvider(input.providerId)
    if (!stored?.enabled) throw new Error('Provider 不存在或未启用')
    if (
      [...this.tasks.values()].some(
        (t) => t.conversationId === input.conversationId,
      )
    )
      throw new Error('该会话已有生成任务')
    const conversation = await runtime.conversationRepository.findById(
      new ConversationId(input.conversationId),
    )
    if (!conversation) throw new Error('会话不存在')
    const history = conversation.activeLeafMessageId
      ? await runtime.messageRepository.findPathToRoot(
          conversation.id,
          conversation.activeLeafMessageId,
        )
      : []
    const requestId = randomUUID()
    const controller = new AbortController()
    const engine = new ChatEngine({
      model: new OpenAICompatibleChatModel({
        baseUrl: stored.baseUrl,
        apiKey: stored.apiKey,
      }),
      characterContextResolver: new SqliteCharacterContextResolver(runtime),
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
      done,
      conversationId: input.conversationId,
    })
    return { requestId }
  }
  async abort(input: AbortGenerationInput, owner?: WebContents): Promise<void> {
    const task = this.tasks.get(input.requestId)
    if (!task) return
    if (owner && task.owner.id !== owner.id)
      throw new Error('不能取消其他窗口的生成任务')
    task.controller.abort()
    await task.done
  }
  async abortByOwner(owner: WebContents): Promise<void> {
    await Promise.all(
      [...this.tasks.entries()]
        .filter(([, t]) => t.owner.id === owner.id)
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
        await runtime.messageRepository.save(event.message)
        await runtime.conversationRepository.save(conversation)
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
        if (!owner.isDestroyed()) owner.send(generationChannels.event, payload)
      }
    } catch (error) {
      const activeId = conversation.activeGenerationMessageId
      const message = activeId
        ? await runtime.messageRepository.findById(activeId)
        : null
      const reason = error instanceof Error ? error.message : String(error)
      if (message?.isInProgress) {
        conversation.failGeneratedMessage(message, reason)
        await runtime.messageRepository.save(message)
        await runtime.conversationRepository.save(conversation)
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
