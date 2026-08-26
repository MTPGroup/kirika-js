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

type StandardIssue = {
  readonly message: string
  readonly path?: readonly (PropertyKey | { key: PropertyKey })[]
}

function isValidationFailure(
  result: unknown,
): result is { error: readonly StandardIssue[] } {
  if (typeof result !== 'object' || result === null) return false
  if (!('success' in result) || result.success !== false) return false
  return 'error' in result && Array.isArray(result.error)
}

export function validationProblemHook() {
  return (result: unknown, c: Context): Response | undefined => {
    if (!isValidationFailure(result)) return undefined

    return c.json(
      {
        type: 'https://api.kirika.cn/problems/validation',
        status: 422,
        title: 'Validation Error',
        detail: '请求参数校验失败',
        errors: result.error.map((issue) => ({
          field:
            issue.path
              ?.map((segment) =>
                typeof segment === 'object'
                  ? String(segment.key)
                  : String(segment),
              )
              .join('.') ?? '',
          message: issue.message,
        })),
      },
      422,
    )
  }
}
