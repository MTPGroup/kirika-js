import type { DialogApi } from '~/shared/ipc'
import { dialogChannels } from './channel.constants'
import { invoke } from './invoke'

export const dialogApi: DialogApi = {
  selectDirectory: (input) => invoke(dialogChannels.selectDirectory, input),
  selectFile: (input) => invoke(dialogChannels.selectFile, input),
  saveFile: (input) => invoke(dialogChannels.saveFile, input),
}
