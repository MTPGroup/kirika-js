import { contextBridge } from 'electron'
import { studioApi } from './ipc'

if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('api', studioApi)
    contextBridge.exposeInMainWorld('platform', process.platform)
  } catch (error) {
    console.error('Studio preload API 注入失败', error)
  }
} else {
  // @ts-expect-error (defined in index.d.ts)
  window.api = studioApi
  // @ts-expect-error (defined in index.d.ts)
  window.platform = process.platform
}
