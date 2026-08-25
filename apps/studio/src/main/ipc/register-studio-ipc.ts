import { type IpcMainInvokeEvent, ipcMain } from 'electron'
import type { z } from 'zod'
import {
  characterChannels,
  conversationChannels,
  dialogChannels,
  generationChannels,
  type InputStudioChannel,
  type IpcResult,
  lorebookChannels,
  profileChannels,
  providerChannels,
  studioInputSchemas,
  windowChannels,
  workspaceChannels,
} from '~/shared/ipc'
import { characterService } from '../services/character.service'
import { conversationService } from '../services/conversation.service'
import { dialogService } from '../services/dialog.service'
import { generationService } from '../services/generation.service'
import { lorebookService } from '../services/lorebook.service'
import { profileService } from '../services/profile.service'
import {
  providerService,
  workspaceService,
} from '../services/workspace-provider.service'
import { openAboutWindow, openSettingsWindow } from '../window'
import { toIpcError } from './ipc-error'

function result<T>(operation: () => Promise<T> | T): Promise<IpcResult<T>> {
  return Promise.resolve()
    .then(async () => await operation())
    .then(
      (value) => ({ ok: true, value }),
      (error: unknown) => ({ ok: false, error: toIpcError(error) }),
    )
}

function register<C extends InputStudioChannel>(
  channels: string[],
  channel: C,
  operation: (input: z.output<(typeof studioInputSchemas)[C]>) => unknown,
) {
  ipcMain.removeHandler(channel)
  ipcMain.handle(channel, (_event, input: unknown) =>
    result(() => operation(studioInputSchemas[channel].parse(input) as never)),
  )
  channels.push(channel)
}

function registerNoInput(
  channels: string[],
  channel: string,
  operation: () => unknown,
) {
  ipcMain.removeHandler(channel)
  ipcMain.handle(channel, () => result(operation))
  channels.push(channel)
}

function registerWithEvent<C extends InputStudioChannel>(
  channels: string[],
  channel: C,
  operation: (
    input: z.output<(typeof studioInputSchemas)[C]>,
    event: IpcMainInvokeEvent,
  ) => unknown,
) {
  ipcMain.removeHandler(channel)
  ipcMain.handle(channel, (event, input: unknown) =>
    result(() =>
      operation(studioInputSchemas[channel].parse(input) as never, event),
    ),
  )
  channels.push(channel)
}

export function registerStudioIpc(): () => void {
  const channels: string[] = []
  registerNoInput(channels, windowChannels.openSettings, () => {
    openSettingsWindow()
  })
  registerNoInput(channels, windowChannels.openAbout, () => {
    openAboutWindow()
  })
  registerNoInput(
    channels,
    profileChannels.selectAvatar,
    profileService.selectProfileAvatar,
  )
  register(
    channels,
    profileChannels.saveAvatar,
    profileService.saveProfileAvatar,
  )
  register(
    channels,
    dialogChannels.selectDirectory,
    dialogService.selectDirectory,
  )
  register(channels, dialogChannels.selectFile, dialogService.selectFile)
  register(channels, dialogChannels.saveFile, dialogService.saveFile)
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
  register(
    channels,
    providerChannels.testConnection,
    providerService.testProviderConnection,
  )
  register(
    channels,
    providerChannels.listModels,
    providerService.listProviderModels,
  )
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
    characterChannels.saveDraft,
    characterService.saveCharacterDraft,
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
    characterChannels.importAsset,
    characterService.importCharacterAsset,
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
    conversationChannels.createTest,
    conversationService.createTestConversation,
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
  registerWithEvent(channels, generationChannels.start, (input, event) =>
    generationService.start(input, event.sender),
  )
  registerWithEvent(channels, generationChannels.startTest, (input, event) =>
    generationService.startTest(input, event.sender),
  )
  registerWithEvent(channels, generationChannels.abort, (input, event) =>
    generationService.abort(input, event.sender),
  )
  return () => {
    for (const channel of channels) ipcMain.removeHandler(channel)
  }
}
