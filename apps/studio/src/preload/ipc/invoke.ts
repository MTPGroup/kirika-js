import { ipcRenderer } from 'electron'
import type { StudioChannel } from '~/shared/ipc'

export function invoke<T>(channel: StudioChannel, input?: unknown): Promise<T> {
  return input === undefined
    ? (ipcRenderer.invoke(channel) as Promise<T>)
    : (ipcRenderer.invoke(channel, input) as Promise<T>)
}
