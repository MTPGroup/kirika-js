import { characterChannels } from './character'
import { conversationChannels } from './conversation'
import { generationChannels } from './generation'
import { lorebookChannels } from './lorebook'
import { providerChannels } from './provider'
import { workspaceChannels } from './workspace'

export const StudioChannels = {
  workspace: workspaceChannels,
  provider: providerChannels,
  character: characterChannels,
  lorebook: lorebookChannels,
  conversation: conversationChannels,
  generation: generationChannels,
} as const

export type StudioChannel =
  | (typeof workspaceChannels)[keyof typeof workspaceChannels]
  | (typeof providerChannels)[keyof typeof providerChannels]
  | (typeof characterChannels)[keyof typeof characterChannels]
  | (typeof lorebookChannels)[keyof typeof lorebookChannels]
  | (typeof conversationChannels)[keyof typeof conversationChannels]
  | (typeof generationChannels)[keyof typeof generationChannels]
