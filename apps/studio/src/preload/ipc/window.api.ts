import type { WindowApi } from '~/shared/ipc'
import { windowChannels } from './channel.constants'
import { invoke } from './invoke'

export const windowApi: WindowApi = {
  openSettingsWindow: () => invoke(windowChannels.openSettings),
  openAboutWindow: () => invoke(windowChannels.openAbout),
}
