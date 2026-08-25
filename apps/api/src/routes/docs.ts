import { Scalar } from '@scalar/hono-api-reference'
import type { Hono } from 'hono'
import { openAPIRouteHandler } from 'hono-openapi'
import type { AppEnv } from '../lib/logger'

export function mountApiDocumentation(app: Hono<AppEnv>): void {
  app.get(
    '/openapi.json',
    openAPIRouteHandler(app, {
      documentation: {
        openapi: '3.1.1',
        info: {
          title: 'Kirika API',
          version: '1.0.0',
          description: '角色、世界书与 AI RP 对话接口。',
        },
        tags: [
          { name: 'System', description: '服务状态。' },
          { name: 'Characters', description: '角色与角色版本生命周期。' },
          { name: 'Lorebooks', description: '世界书、条目与版本生命周期。' },
          { name: 'Conversations', description: '会话创建与流式生成。' },
        ],
        components: {
          securitySchemes: {
            sessionCookie: {
              type: 'apiKey',
              in: 'cookie',
              name: 'better-auth.session_token',
            },
          },
        },
      },
      exclude: [/^\/api\/auth(?:\/|$)/, '/docs', '/openapi.json'],
    }),
  )

  app.get(
    '/docs',
    Scalar({
      pageTitle: 'Kirika API Reference',
      theme: 'purple',
      persistAuth: true,
      sources: [
        {
          title: 'Kirika API',
          slug: 'kirika-api',
          url: '/openapi.json',
          default: true,
        },
        {
          title: 'Authentication',
          slug: 'authentication',
          url: '/api/auth/open-api/generate-schema',
        },
      ],
    }),
  )
}
