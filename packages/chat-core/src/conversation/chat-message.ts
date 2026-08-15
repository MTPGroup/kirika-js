export type MessageRole = 'user' | 'assistant'

export interface TextContentPart {
	type: 'text'
	text: string
}

export interface ImageContentPart {
	type: 'image_url'
	image_url: {
		url: string
		detail?: 'auto' | 'low' | 'high'
	}
}

export interface MediaContentPart {
	type: 'media'
	media: {
		mimeType: string
		data: string
	}
}

export type MessageContentPart =
	| TextContentPart
	| ImageContentPart
	| MediaContentPart

export type MessageContent = string | MessageContentPart[]

export interface ChatMessage {
	role: MessageRole
	content: MessageContent
	name?: string
}
