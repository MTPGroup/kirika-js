import type { ProfileApi } from '~/shared/ipc'
import { profileChannels } from '~/shared/ipc'
import { invoke } from './invoke'

export const profileApi: ProfileApi = {
  selectProfileAvatar: () => invoke(profileChannels.selectAvatar),
  saveProfileAvatar: (input) => invoke(profileChannels.saveAvatar, input),
}
