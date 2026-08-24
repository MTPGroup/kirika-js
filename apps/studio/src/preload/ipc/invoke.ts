import { ipcRenderer } from 'electron'
import type { IpcErrorPayload, IpcResult, StudioChannel } from '~/shared/ipc'

export class StudioApiError extends Error {
  constructor(readonly payload: IpcErrorPayload) {
    super(payload.message)
    this.name = 'StudioApiError'
  }

  get code() {
    return this.payload.code
  }
  get details() {
    return this.payload.details
  }
}

export async function invoke<T>(
  channel: StudioChannel,
  input?: unknown,
): Promise<T> {
  const response =
    input === undefined
      ? await ipcRenderer.invoke(channel)
      : await ipcRenderer.invoke(channel, input)
  const result = response as IpcResult<T>
  if (!result || typeof result !== 'object' || typeof result.ok !== 'boolean')
    throw new StudioApiError({
      code: 'UNKNOWN',
      message: '主进程返回了无效的 IPC 响应',
    })
  if (!result.ok) throw new StudioApiError(result.error)
  return result.value
}
