import type { CharacterApi } from './character'
import type { ConversationApi } from './conversation'
import type { GenerationApi } from './generation'
import type { LorebookApi } from './lorebook'
import type { ProviderApi } from './provider'
import type { WorkspaceApi } from './workspace'

export interface StudioApi
  extends WorkspaceApi,
    ProviderApi,
    CharacterApi,
    LorebookApi,
    ConversationApi,
    GenerationApi {}
