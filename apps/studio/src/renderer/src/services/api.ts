import type { IpcErrorPayload, StudioApi } from '../../../shared/ipc/contracts'

export type * from '../../../shared/ipc/contracts'

/**
 * 渲染层统一从 `window.api` 取值。
 * `window.api` 已由 preload 以白名单 + typed 方式暴露，本层只需做错误归一化与
 * 偶尔的类型收窄，组件与 store 不直接触碰 `ipcRenderer`。
 */
export const api: StudioApi = window.api

/** 把主进程抛出的错误转成结构化的 IpcErrorPayload 形状。 */
export function toIpcError(error: unknown): IpcErrorPayload {
  if (isIpcErrorLike(error)) return error

  return {
    code: 'UNKNOWN',
    message: error instanceof Error ? error.message : String(error),
  }
}

function isIpcErrorLike(value: unknown): value is IpcErrorPayload {
  return (
    typeof value === 'object' &&
    value !== null &&
    'code' in value &&
    'message' in value
  )
}
