import type {
  ConversationApi,
  ConversationDto,
  ConversationMessageDto,
  ConversationSummaryDto,
  GetConversationHistoryResult,
} from '~/shared/ipc'
import { conversationChannels } from '~/shared/ipc'
import { invoke } from './invoke'

export const conversationApi: ConversationApi = {
  listConversations: () =>
    invoke<readonly ConversationSummaryDto[]>(conversationChannels.list),
  createConversation: (input) =>
    invoke<ConversationDto>(conversationChannels.create, input),
  createTestConversation: (input) =>
    invoke<ConversationDto>(conversationChannels.createTest, input),
  getConversation: (input) =>
    invoke<ConversationDto | null>(conversationChannels.get, input),
  getConversationHistory: (input) =>
    invoke<GetConversationHistoryResult>(
      conversationChannels.getHistory,
      input,
    ),
  deleteConversation: (input) =>
    invoke<void>(conversationChannels.delete, input),
  renameConversation: (input) =>
    invoke<ConversationDto>(conversationChannels.rename, input),
  changeConversationTurnPolicy: (input) =>
    invoke<ConversationDto>(conversationChannels.changeTurnPolicy, input),
  addCharacterParticipant: (input) =>
    invoke<ConversationDto>(conversationChannels.addCharacter, input),
  removeConversationParticipant: (input) =>
    invoke<ConversationDto>(conversationChannels.removeParticipant, input),
  renameConversationParticipant: (input) =>
    invoke<ConversationDto>(conversationChannels.renameParticipant, input),
  sendHumanMessage: (input) =>
    invoke<ConversationMessageDto>(
      conversationChannels.sendHumanMessage,
      input,
    ),
  selectConversationBranch: (input) =>
    invoke<ConversationDto>(conversationChannels.selectBranch, input),
  archiveConversation: (input) =>
    invoke<ConversationDto>(conversationChannels.archive, input),
  restoreConversation: (input) =>
    invoke<ConversationDto>(conversationChannels.restore, input),
}
