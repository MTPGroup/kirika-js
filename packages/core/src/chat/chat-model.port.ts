import type { ChatModelRequest, ChatModelStreamEvent } from './chat-model'

export interface ChatModelPort {
  generate(
    request: ChatModelRequest,
    signal?: AbortSignal,
  ): AsyncIterable<ChatModelStreamEvent>
}
