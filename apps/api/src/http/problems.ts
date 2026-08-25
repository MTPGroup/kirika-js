import type { Context } from 'hono'
import { createProblemTypeRegistry } from 'hono-problem-details'

export const problems = createProblemTypeRegistry(
  {
    UNAUTHORIZED: {
      type: 'https://api.kirika.cn/problems/unauthorized',
      status: 401,
      title: 'Unauthorized',
    },
    FORBIDDEN: {
      type: 'https://api.kirika.cn/problems/forbidden',
      status: 403,
      title: 'Forbidden',
    },
    NOT_FOUND: {
      type: 'https://api.kirika.cn/problems/not-found',
      status: 404,
      title: 'Not Found',
    },
    INVALID_STATE: {
      type: 'https://api.kirika.cn/problems/invalid-state',
      status: 422,
      title: 'Invalid State',
    },
    RATE_LIMITED: {
      type: 'https://api.kirika.cn/problems/rate-limited',
      status: 429,
      title: 'Too Many Requests',
    },
    CONFLICT: {
      type: 'https://api.kirika.cn/problems/conflict',
      status: 409,
      title: 'Conflict',
    },
    PAYLOAD_TOO_LARGE: {
      type: 'https://api.kirika.cn/problems/payload-too-large',
      status: 413,
      title: 'Payload Too Large',
    },
  },
  { autoCode: true },
)

export interface ValidationIssue {
  readonly path: readonly PropertyKey[]
  readonly message: string
  readonly code: string
}

export function validationProblemHook() {
  return (
    result:
      | { success: true; data: unknown }
      | {
          success: false
          error: { issues: readonly ValidationIssue[] }
        },
    c: Context,
  ): Response | undefined => {
    if (result.success) return undefined

    return c.json(
      {
        type: 'https://api.kirika.cn/problems/validation',
        status: 422,
        title: 'Validation Error',
        detail: '请求参数校验失败',
        errors: result.error.issues.map((issue) => ({
          field: issue.path.join('.'),
          message: issue.message,
          code: issue.code,
        })),
      },
      422,
    )
  }
}
