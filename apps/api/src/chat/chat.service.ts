import type {
  ChatCharacterContextResolverPort,
  ChatModelPort,
} from '@kirika-js/core/chat'
import {
  ChatEngine,
  type ChatEngineEvent,
  type ChatTerminalEvent,
} from '@kirika-js/core/chat'
import type {
  Conversation,
  ConversationMessage,
  ConversationMessageRepositoryPort,
  ConversationParticipantId,
  ConversationRepositoryPort,
  MessageContent,
} from '@kirika-js/core/domain/conversation'

export interface SendMessageInput {
  readonly conversation: Conversation
  readonly history: readonly ConversationMessage[]
  readonly humanParticipantId: ConversationParticipantId
  readonly content: MessageContent
  readonly model?: string
  readonly signal?: AbortSignal
}

export interface ChatServiceDependencies {
  readonly model: ChatModelPort
  readonly characterContextResolver: ChatCharacterContextResolverPort
  readonly conversationRepository: ConversationRepositoryPort
  readonly messageRepository: ConversationMessageRepositoryPort
  readonly defaultModel: string
}

export class ChatService {
  private readonly engine: ChatEngine

  constructor(private readonly deps: ChatServiceDependencies) {
    this.engine = new ChatEngine({
      model: deps.model,
      characterContextResolver: deps.characterContextResolver,
    })
  }

  async *sendMessage(
    input: SendMessageInput,
  ): AsyncGenerator<ChatEngineEvent, ChatTerminalEvent | null, void> {
    const humanMessage = input.conversation.createHumanMessage(
      input.humanParticipantId,
      input.content,
      input.history.at(-1) ?? null,
    )

    await this.deps.messageRepository.save(humanMessage)
    await this.deps.conversationRepository.save(input.conversation)

    const history = [...input.history, humanMessage]
    let terminal: ChatTerminalEvent | null = null

    for await (const event of this.engine.generateTurn({
      conversation: input.conversation,
      history,
      model: input.model?.trim() || this.deps.defaultModel,
      signal: input.signal,
    })) {
      yield event

      if (
        event.type === 'completed' ||
        event.type === 'failed' ||
        event.type === 'cancelled'
      ) {
        terminal = event
        await this.deps.messageRepository.save(event.message)
        await this.deps.conversationRepository.save(input.conversation)
      }
    }

    return terminal
  }
}
