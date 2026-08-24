import type { CharacterApi } from './character'
import type { ConversationApi } from './conversation'
import type { DialogApi } from './dialog'
import type { GenerationApi } from './generation'
import type { LorebookApi } from './lorebook'
import type { ProfileApi } from './profile'
import type { ProviderApi } from './provider'
import type { WindowApi } from './window'
import type { WorkspaceApi } from './workspace'

export interface StudioApi
  extends WorkspaceApi,
    ProviderApi,
    ProfileApi,
    DialogApi,
    CharacterApi,
    LorebookApi,
    ConversationApi,
    GenerationApi,
    WindowApi {}
