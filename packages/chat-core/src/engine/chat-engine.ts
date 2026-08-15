import {
	type BuildOptions,
	PromptBuilder,
	type PromptPayload,
	type PromptTokenizer,
} from '../prompt'
import type { ChatTransport } from '../transport/chat-transport'

export interface ChatEngineConfig {
	tokenizer: PromptTokenizer
	transport?: ChatTransport
}

export class ChatEngine {
	private builder: PromptBuilder

	constructor(private config: ChatEngineConfig) {
		this.builder = new PromptBuilder(config.tokenizer)
	}

	buildPrompt(opts: BuildOptions): PromptPayload {
		return this.builder.build(opts)
	}

	async *sendMessageStream(
		opts: BuildOptions,
		signal?: AbortSignal,
	): AsyncIterable<string> {
		if (!this.config.transport) {
			throw new Error(
				'[chat-core] Cannot stream without a ChatTransport instance.',
			)
		}
		const payload = this.buildPrompt(opts)
		yield* this.config.transport.sendStream(payload, signal)
	}
}
