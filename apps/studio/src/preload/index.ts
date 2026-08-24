import { electronAPI } from '@electron-toolkit/preload'
import { contextBridge } from 'electron'
import { studioApi } from './ipc'

if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electron', electronAPI)
    contextBridge.exposeInMainWorld('api', studioApi)
  } catch (error) {
    console.error(error)
  }
} else {
  // @ts-expect-error (defined in index.d.ts)
  window.electron = electronAPI
  // @ts-expect-error (defined in index.d.ts)
  window.api = studioApi
}
