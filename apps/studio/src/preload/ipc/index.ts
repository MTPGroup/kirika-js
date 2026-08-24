import type { StudioApi } from '../../shared/ipc'
import { characterApi } from './character.api'
import { conversationApi } from './conversation.api'
import { dialogApi } from './dialog.api'
import { generationApi } from './generation.api'
import { lorebookApi } from './lorebook.api'
import { providerApi } from './provider.api'
import { workspaceApi } from './workspace.api'

export const studioApi: StudioApi = {
  ...workspaceApi,
  ...providerApi,
  ...dialogApi,
  ...characterApi,
  ...lorebookApi,
  ...conversationApi,
  ...generationApi,
}
