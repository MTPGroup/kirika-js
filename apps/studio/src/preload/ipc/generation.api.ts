import type { IpcRendererEvent } from 'electron'
import { ipcRenderer } from 'electron'
import type {
  GenerationApi,
  GenerationEvent,
  StartGenerationResult,
} from '../../shared/ipc'
import { generationChannels, generationEventSchema } from '../../shared/ipc'
import { invoke } from './invoke'

export const generationApi: GenerationApi = {
  startGeneration: (input) =>
    invoke<StartGenerationResult>(generationChannels.start, input),
  abortGeneration: (input) => invoke<void>(generationChannels.abort, input),
  onGenerationEvent: (listener) => {
    const handler = (_event: IpcRendererEvent, payload: unknown) => {
      const parsed = generationEventSchema.safeParse(payload)
      if (parsed.success) listener(parsed.data as unknown as GenerationEvent)
    }
    ipcRenderer.on(generationChannels.event, handler)
    return () => ipcRenderer.removeListener(generationChannels.event, handler)
  },
}
