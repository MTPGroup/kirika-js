import type { MiddlewareHandler } from 'hono'
import { problems } from './problems'

export interface IdempotencyMiddlewareOptions {
  readonly resourceId: (c: Parameters<MiddlewareHandler>[0]) => string
}

export function idempotency(
  options: IdempotencyMiddlewareOptions,
): MiddlewareHandler {
  return async (c, next) => {
    const key = c.req.header('idempotency-key')
    if (!key) {
      throw problems.create('INVALID_STATE', {
        detail: '缺少 Idempotency-Key 请求头',
      })
    }

    const session = await c.var.di.get('auth').api.getSession({
      headers: c.req.raw.headers,
    })
    if (!session) {
      throw problems.create('UNAUTHORIZED', { detail: '未登录' })
    }

    const store = c.var.di.get('idempotencyStore')
    const userId = session.user.id
    const resourceId = options.resourceId(c)

    const existing = await store.find(key)
    if (existing) {
      if (existing.userId !== userId || existing.resourceId !== resourceId) {
        throw problems.create('CONFLICT', {
          detail: 'Idempotency-Key 已被用于其他请求',
        })
      }
      return c.json(
        {
          type: 'https://api.kirika.cn/problems/idempotent-replay',
          status: 200,
          title: 'OK',
          detail: '该请求已在处理或已完成',
          idempotentReplay: true,
        },
        200,
      )
    }

    await store.create(
      key,
      userId,
      resourceId,
      new Date(Date.now() + 24 * 60 * 60 * 1000),
    )

    await next()
  }
}
