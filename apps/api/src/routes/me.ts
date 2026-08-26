import type { Hono } from 'hono'
import { describeRoute, validator as zValidator } from 'hono-openapi'
import { problemDetailsResponseJsonSchema } from 'hono-problem-details/openapi-json-schema'
import { z } from 'zod'
import type { AppEnv } from '../container'
import { jsonResponse, sessionSecurity } from '../http/openapi'
import { problems, validationProblemHook } from '../http/problems'

const updateMeSchema = z.object({
  name: z.string().trim().min(1).max(200).optional(),
  image: z.string().trim().min(1).nullable().optional(),
})

const userJsonSchema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string(),
  emailVerified: z.boolean(),
  image: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
})

const meResponseSchema = z.object({
  user: userJsonSchema,
})

export function mountMeRoutes(app: Hono<AppEnv>): void {
  app.get(
    '/me',
    describeRoute({
      tags: ['Profile'],
      summary: '当前用户信息',
      security: sessionSecurity,
      responses: {
        200: jsonResponse(meResponseSchema, '用户信息。'),
        401: problemDetailsResponseJsonSchema(401, '未登录'),
      },
    }),
    async (c) => {
      const session = await c.var.di.get('auth').api.getSession({
        headers: c.req.raw.headers,
      })
      if (!session) {
        throw problems.create('UNAUTHORIZED', { detail: '未登录' })
      }
      return c.json({ user: session.user })
    },
  )

  app.patch(
    '/me',
    describeRoute({
      tags: ['Profile'],
      summary: '更新当前用户信息',
      security: sessionSecurity,
      responses: {
        200: jsonResponse(meResponseSchema, '用户信息已更新。'),
        401: problemDetailsResponseJsonSchema(401, '未登录'),
      },
    }),
    zValidator('json', updateMeSchema, validationProblemHook()),
    async (c) => {
      const auth = c.var.di.get('auth')
      const session = await auth.api.getSession({
        headers: c.req.raw.headers,
      })
      if (!session) {
        throw problems.create('UNAUTHORIZED', { detail: '未登录' })
      }

      await auth.api.updateUser({
        body: c.req.valid('json'),
        headers: c.req.raw.headers,
      })

      const fresh = await auth.api.getSession({
        headers: c.req.raw.headers,
      })
      return c.json({ user: fresh?.user ?? null })
    },
  )
}
