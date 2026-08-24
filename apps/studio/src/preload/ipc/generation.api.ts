import type { IpcRendererEvent } from 'electron'
import { ipcRenderer } from 'electron'
import type {
  GenerationApi,
  GenerationEvent,
  StartGenerationResult,
} from '../../shared/ipc'
import { generationChannels } from '../../shared/ipc'
import { invoke } from './invoke'

export const generationApi: GenerationApi = {
  startGeneration: (input) =>
    invoke<StartGenerationResult>(generationChannels.start, input),
  abortGeneration: (input) => invoke<void>(generationChannels.abort, input),
  onGenerationEvent: (listener) => {
    const handler = (_event: IpcRendererEvent, payload: GenerationEvent) =>
      listener(payload)
    ipcRenderer.on(generationChannels.event, handler)
    return () => ipcRenderer.removeListener(generationChannels.event, handler)
  },
}
