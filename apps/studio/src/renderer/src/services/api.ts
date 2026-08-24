import type { IpcErrorPayload, StudioApi } from '~/shared/ipc'

export type * from '~/shared/ipc'

export const api: StudioApi = window.api

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
