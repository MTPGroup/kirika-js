import { zValidator } from '@hono/zod-validator'
import type { Hono } from 'hono'
import { describeRoute } from 'hono-openapi'
import { z } from 'zod'
import type { AppEnv } from '../container'
import { listQuerySchema } from '../http/openapi'
import { validationProblemHook } from '../http/problems'

const discoverLorebookQuerySchema = listQuerySchema.extend({
  q: z.string().trim().min(1).max(100).optional(),
})

export function mountDiscoverRoutes(app: Hono<AppEnv>): void {
  app.get(
    '/discover/lorebooks',
    describeRoute({
      tags: ['Discover'],
      summary: '公开世界书发现与搜索',
      responses: {
        200: { description: '公开世界书分页列表。' },
      },
    }),
    zValidator('query', discoverLorebookQuerySchema, validationProblemHook()),
    async (c) => {
      const { limit, offset, q } = c.req.valid('query')
      const result = await c.var.di
        .get('lorebookRepository')
        .listPublic(limit, offset, q)
      return c.json(result)
    },
  )
}
