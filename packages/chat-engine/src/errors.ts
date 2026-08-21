export class ChatEngineError extends Error {
	constructor(message: string, options?: ErrorOptions) {
		super(message, options)
		this.name = new.target.name
	}
}

export class InvalidChatHistoryError extends ChatEngineError {}

export class ChatSpeakerSelectionError extends ChatEngineError {}

export class ChatCharacterContextNotFoundError extends ChatEngineError {}

export class ChatGenerationAbortedError extends ChatEngineError {
	constructor() {
		super('聊天生成在开始前已取消')
	}
}
