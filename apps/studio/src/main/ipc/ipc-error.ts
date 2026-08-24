import { ConversationGenerationConflictError } from '@kirika-js/adapter-persistence-sqlite'
import { ZodError } from 'zod'
import type { IpcErrorCode, IpcErrorPayload } from '~/shared/ipc'
import { StudioWorkspaceNotOpenError } from '../studio-runtime'

export class StudioIpcError extends Error {
  constructor(
    readonly code: IpcErrorCode,
    message: string,
    readonly details?: unknown,
  ) {
    super(message)
    this.name = 'StudioIpcError'
  }
}

export function toIpcError(error: unknown): IpcErrorPayload {
  if (error instanceof StudioIpcError)
    return { code: error.code, message: error.message, details: error.details }
  if (error instanceof ZodError)
    return {
      code: 'VALIDATION',
      message: 'IPC 输入校验失败',
      details: error.issues,
    }
  if (error instanceof StudioWorkspaceNotOpenError)
    return { code: 'WORKSPACE_NOT_OPEN', message: error.message }
  if (error instanceof ConversationGenerationConflictError)
    return { code: 'CONFLICT', message: error.message }

  const message = error instanceof Error ? error.message : String(error)
  const code = inferCode(message)
  return { code, message }
}

function inferCode(message: string): IpcErrorCode {
  if (/不存在|未找到/.test(message)) return 'NOT_FOUND'
  if (/已有|冲突|不能取消其他窗口/.test(message)) return 'CONFLICT'
  if (/取消|中止|abort/i.test(message)) return 'CANCELLED'
  if (/provider|模型|model/i.test(message)) return 'MODEL'
  if (/network|fetch|连接|timeout/i.test(message)) return 'NETWORK'
  if (/不能为空|必须|无效|至少|仅内置|格式/.test(message)) return 'VALIDATION'
  return 'UNKNOWN'
}
