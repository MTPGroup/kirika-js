import { type IpcMainInvokeEvent, ipcMain } from 'electron'
import type { AbortGenerationInput, StartGenerationInput } from '~/shared/ipc'
import {
  characterChannels,
  conversationChannels,
  generationChannels,
  lorebookChannels,
  providerChannels,
  workspaceChannels,
} from '~/shared/ipc'
import { characterService } from '../services/character.service'
import { conversationService } from '../services/conversation.service'
import { generationService } from '../services/generation.service'
import { lorebookService } from '../services/lorebook.service'
import {
  providerService,
  workspaceService,
} from '../services/workspace-provider.service'

function register<T>(
  channels: string[],
  channel: string,
  operation: (input: T) => unknown,
) {
  ipcMain.removeHandler(channel)
  ipcMain.handle(channel, (_event, input: T) => operation(input))
  channels.push(channel)
}
function registerNoInput(
  channels: string[],
  channel: string,
  operation: () => unknown,
) {
  ipcMain.removeHandler(channel)
  ipcMain.handle(channel, operation)
  channels.push(channel)
}
function registerWithEvent<T>(
  channels: string[],
  channel: string,
  operation: (input: T, event: IpcMainInvokeEvent) => unknown,
) {
  ipcMain.removeHandler(channel)
  ipcMain.handle(channel, (event, input: T) => operation(input, event))
  channels.push(channel)
}

export function registerStudioIpc(): () => void {
  const channels: string[] = []
  register(channels, workspaceChannels.open, workspaceService.openWorkspace)
  register(channels, workspaceChannels.create, workspaceService.createWorkspace)
  registerNoInput(
    channels,
    workspaceChannels.getState,
    workspaceService.getWorkspaceState,
  )
  registerNoInput(
    channels,
    workspaceChannels.close,
    workspaceService.closeWorkspace,
  )
  registerNoInput(
    channels,
    workspaceChannels.listRecent,
    workspaceService.listRecentWorkspaces,
  )
  registerNoInput(
    channels,
    providerChannels.list,
    providerService.listProviders,
  )
  register(channels, providerChannels.save, providerService.saveProvider)
  register(channels, providerChannels.delete, providerService.deleteProvider)
  registerNoInput(
    channels,
    characterChannels.list,
    characterService.listCharacters,
  )
  register(channels, characterChannels.create, characterService.createCharacter)
  register(channels, characterChannels.get, characterService.getCharacter)
  register(channels, characterChannels.delete, characterService.deleteCharacter)
  register(
    channels,
    characterChannels.updateDraft,
    characterService.updateCharacterDraft,
  )
  register(
    channels,
    characterChannels.replaceGreetings,
    characterService.replaceCharacterGreetings,
  )
  register(
    channels,
    characterChannels.replaceExamples,
    characterService.replaceCharacterExamples,
  )
  register(
    channels,
    characterChannels.replaceAssets,
    characterService.replaceCharacterAssets,
  )
  register(
    channels,
    characterChannels.replaceLorebooks,
    characterService.replaceCharacterLorebooks,
  )
  register(
    channels,
    characterChannels.createDraft,
    characterService.createCharacterDraft,
  )
  register(
    channels,
    characterChannels.publish,
    characterService.publishCharacterRevision,
  )
  register(
    channels,
    characterChannels.importCard,
    characterService.importCharacterCard,
  )
  register(
    channels,
    characterChannels.exportCard,
    characterService.exportCharacterCard,
  )
  registerNoInput(
    channels,
    lorebookChannels.list,
    lorebookService.listLorebooks,
  )
  register(channels, lorebookChannels.create, lorebookService.createLorebook)
  register(channels, lorebookChannels.get, lorebookService.getLorebook)
  register(channels, lorebookChannels.delete, lorebookService.deleteLorebook)
  register(
    channels,
    lorebookChannels.updateMetadata,
    lorebookService.updateLorebookMetadata,
  )
  register(
    channels,
    lorebookChannels.changeVisibility,
    lorebookService.changeLorebookVisibility,
  )
  register(
    channels,
    lorebookChannels.createDraft,
    lorebookService.createLorebookDraft,
  )
  register(
    channels,
    lorebookChannels.replaceEntries,
    lorebookService.replaceLorebookEntries,
  )
  register(
    channels,
    lorebookChannels.publish,
    lorebookService.publishLorebookRevision,
  )
  registerNoInput(
    channels,
    conversationChannels.list,
    conversationService.listConversations,
  )
  register(
    channels,
    conversationChannels.create,
    conversationService.createConversation,
  )
  register(
    channels,
    conversationChannels.get,
    conversationService.getConversation,
  )
  register(
    channels,
    conversationChannels.getHistory,
    conversationService.getConversationHistory,
  )
  register(
    channels,
    conversationChannels.delete,
    conversationService.deleteConversation,
  )
  register(
    channels,
    conversationChannels.rename,
    conversationService.renameConversation,
  )
  register(
    channels,
    conversationChannels.changeTurnPolicy,
    conversationService.changeConversationTurnPolicy,
  )
  register(
    channels,
    conversationChannels.addCharacter,
    conversationService.addCharacterParticipant,
  )
  register(
    channels,
    conversationChannels.removeParticipant,
    conversationService.removeConversationParticipant,
  )
  register(
    channels,
    conversationChannels.renameParticipant,
    conversationService.renameConversationParticipant,
  )
  register(
    channels,
    conversationChannels.sendHumanMessage,
    conversationService.sendHumanMessage,
  )
  register(
    channels,
    conversationChannels.selectBranch,
    conversationService.selectConversationBranch,
  )
  register(
    channels,
    conversationChannels.archive,
    conversationService.archiveConversation,
  )
  register(
    channels,
    conversationChannels.restore,
    conversationService.restoreConversation,
  )
  registerWithEvent<StartGenerationInput>(
    channels,
    generationChannels.start,
    (input, event) => generationService.start(input, event.sender),
  )
  registerWithEvent<AbortGenerationInput>(
    channels,
    generationChannels.abort,
    (input, event) => generationService.abort(input, event.sender),
  )
  return () => {
    for (const channel of channels) ipcMain.removeHandler(channel)
  }
}
