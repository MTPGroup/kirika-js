export type IsoDateTime = string

export type IpcErrorCode =
  | 'NOT_FOUND'
  | 'VALIDATION'
  | 'CONFLICT'
  | 'UNAUTHORIZED'
  | 'NETWORK'
  | 'MODEL'
  | 'CANCELLED'
  | 'WORKSPACE_NOT_OPEN'
  | 'UNKNOWN'

export interface IpcErrorPayload {
  readonly code: IpcErrorCode
  readonly message: string
  readonly details?: unknown
}
