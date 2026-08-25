import type { IpcRendererEvent } from 'electron'
import { ipcRenderer } from 'electron'
import type {
  GenerationApi,
  GenerationEvent,
  StartGenerationResult,
} from '../../shared/ipc'
import { generationChannels } from './channel.constants'
import { invoke } from './invoke'

function isGenerationEvent(value: unknown): value is GenerationEvent {
  if (!value || typeof value !== 'object') return false
  const event = value as Record<string, unknown>
  return (
    typeof event.requestId === 'string' &&
    typeof event.messageId === 'string' &&
    typeof event.type === 'string' &&
    [
      'preparing',
      'started',
      'text_delta',
      'content_part',
      'completed',
      'failed',
      'cancelled',
    ].includes(event.type)
  )
}

export const generationApi: GenerationApi = {
  startGeneration: (input) =>
    invoke<StartGenerationResult>(generationChannels.start, input),
  startTestGeneration: (input) =>
    invoke<StartGenerationResult>(generationChannels.startTest, input),
  abortGeneration: (input) => invoke<void>(generationChannels.abort, input),
  onGenerationEvent: (listener) => {
    const handler = (_event: IpcRendererEvent, payload: unknown) => {
      if (isGenerationEvent(payload)) listener(payload)
    }
    ipcRenderer.on(generationChannels.event, handler)
    return () => ipcRenderer.removeListener(generationChannels.event, handler)
  },
}
