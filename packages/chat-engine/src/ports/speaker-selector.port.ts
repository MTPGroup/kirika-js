import type {
	Conversation,
	ConversationMessage,
	ConversationParticipant,
	ConversationParticipantId,
} from '@kirika-js/domain/conversation'

export interface AutoSpeakerSelectionInput {
	readonly conversation: Conversation
	readonly history: readonly ConversationMessage[]
	readonly candidates: readonly ConversationParticipant[]
}

export interface AutoSpeakerSelectorPort {
	selectSpeaker(
		input: AutoSpeakerSelectionInput,
	): Promise<ConversationParticipantId>
}
