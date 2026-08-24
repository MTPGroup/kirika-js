import type { WindowApi } from '~/shared/ipc'
import { windowChannels } from '~/shared/ipc'
import { invoke } from './invoke'

export const windowApi: WindowApi = {
  openSettingsWindow: () => invoke(windowChannels.openSettings),
}
