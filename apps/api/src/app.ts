import { inferdiHono } from '@inferdi/hono'
import { honoLogLayer } from '@loglayer/hono'
import { Hono } from 'hono'
import { bodyLimit } from 'hono/body-limit'
import { cors } from 'hono/cors'
import { requestId } from 'hono/request-id'
import { secureHeaders } from 'hono/secure-headers'
import { describeRoute } from 'hono-openapi'
import {
  ProblemDetailsError,
  problemDetails,
  problemDetailsHandler,
} from 'hono-problem-details'
import { rateLimiter } from 'hono-rate-limiter'
import { type AppEnv, buildRootContainer } from './container'
import { mountApiDocumentation } from './http/docs'
import { problems } from './http/problems'
import { log } from './lib/logger'
import { mountAssetRoutes } from './routes/assets'
import { mountAuth } from './routes/auth'
import { mountCharacterRoutes } from './routes/characters'
import { mountChatRoutes } from './routes/chat'
import { mountDiscoverRoutes } from './routes/discover'
import { mountLorebookRoutes } from './routes/lorebooks'

export function createApp() {
  const root = buildRootContainer()
  const config = root.get('config')
  const app = new Hono<AppEnv>()
  const api = new Hono<AppEnv>()
  const authRoutes = new Hono<AppEnv>()

  app.use('*', requestId())
  app.use('*', secureHeaders())
  app.use(
    '*',
    inferdiHono({
      container: root,
      createScope: (container, c) =>
        container.createScope({
          request: {
            requestId: c.req.header('x-request-id') ?? crypto.randomUUID(),
          },
        }),
    }),
  )
  app.use(
    '*',
    honoLogLayer({
      instance: log,
      autoLogging: {
        ignore: ['/health', '/docs', '/openapi.json'],
      },
    }),
  )
  app.use(
    '/api/*',
    cors({
      origin: [...config.app.corsOrigins],
      credentials: true,
      allowHeaders: ['Content-Type', 'Authorization', 'Idempotency-Key'],
      allowMethods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
    }),
  )
  app.use(
    '/api/*',
    bodyLimit({
      maxSize: 2 * 1024 * 1024,
      onError: (c) =>
        c.json(
          {
            type: 'https://api.kirika.cn/problems/payload-too-large',
            status: 413,
            title: 'Payload Too Large',
            detail: '请求体超过 2 MiB 限制',
            instance: c.req.path,
          },
          413,
          { 'content-type': 'application/problem+json; charset=utf-8' },
        ),
    }),
  )

  const problemHandler = problemDetailsHandler({
    includeStack: process.env.NODE_ENV !== 'production',
    autoInstance: true,
  })
  app.onError((err, c) => {
    const status =
      err instanceof ProblemDetailsError ? err.problemDetails.status : 500
    const logger = c.var.logger
      .withError(err)
      .withMetadata({ statusCode: status })
    if (status >= 500) {
      logger.error('Request error')
    } else {
      logger.warn('Request rejected')
    }
    return problemHandler(err, c)
  })

  app.notFound((c) => {
    throw problems.create('NOT_FOUND', {
      detail: '接口不存在',
      instance: c.req.path,
    })
  })

  api.use(
    '/conversations/:id/messages',
    rateLimiter({
      windowMs: 60_000,
      limit: 10,
      keyGenerator: (c) =>
        c.req.header('authorization')?.replace(/^Bearer\s+/i, '') ??
        c.req
          .header('cookie')
          ?.match(/better-auth\.session_token=([^;]+)/)?.[1] ??
        c.req.header('x-forwarded-for')?.split(',')[0]?.trim() ??
        'anonymous',
      handler: () => {
        throw problemDetails({
          status: 429,
          title: 'Too Many Requests',
          type: 'https://api.kirika.cn/problems/rate-limited',
          detail: '请求过于频繁，请稍后再试。',
          extensions: { retryAfter: 60 },
        })
      },
    }),
  )

  app.get(
    '/health',
    describeRoute({
      tags: ['System'],
      summary: '服务健康检查',
      responses: {
        200: { description: '服务正常。' },
      },
    }),
    (c) => c.json({ ok: true }),
  )

  mountAuth(authRoutes)
  api.route('/auth', authRoutes)
  mountAssetRoutes(api)
  mountChatRoutes(api)
  mountCharacterRoutes(api)
  mountDiscoverRoutes(api)
  mountLorebookRoutes(api)

  app.route('/api', api)
  mountApiDocumentation(app)

  return app
}
