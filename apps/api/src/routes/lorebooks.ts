import { zValidator } from '@hono/zod-validator'
import { LorebookEntry, LorebookId } from '@kirika-js/core/domain/lorebook'
import { UserId } from '@kirika-js/core/domain/shared'
import type { Hono } from 'hono'
import { describeRoute } from 'hono-openapi'
import { problemDetailsResponseJsonSchema } from 'hono-problem-details/openapi-json-schema'
import { z } from 'zod'
import type { AppEnv } from '../container'
import { idParamSchema, jsonRequest, sessionSecurity } from '../http/openapi'
import { problems, validationProblemHook } from '../http/problems'
import { lorebookToJson } from '../lorebook/serialize'

const createSchema = z.object({
  name: z.string().trim().min(1),
  description: z.string().optional(),
})

const updateSchema = z.object({
  name: z.string().trim().min(1).optional(),
  description: z.string().optional(),
  visibility: z.enum(['private', 'unlisted', 'public']).optional(),
})

const entrySchema = z.object({
  keys: z.array(z.string().trim().min(1)).min(1),
  secondaryKeys: z.array(z.string().trim().min(1)).optional(),
  title: z.string().trim().min(1),
  enabled: z.boolean().optional(),
  content: z.string().trim().min(1),
  position: z.enum(['before_history', 'after_history', 'at_depth']),
  priority: z.number().int().optional(),
  matchMode: z.enum(['any', 'all']).optional(),
  constant: z.boolean().optional(),
  caseSensitive: z.boolean().optional(),
  matchWholeWords: z.boolean().optional(),
  probability: z.number().int().min(0).max(100).optional(),
  insertionDepth: z.number().int().min(0).optional(),
})

const entriesSchema = z.object({
  entries: z.array(entrySchema),
})

const settingsSchema = z.object({
  scanDepth: z.number().int().min(1),
  tokenBudget: z.number().int().min(1),
})

export function mountLorebookRoutes(app: Hono<AppEnv>): void {
  app.post(
    '/lorebooks',
    describeRoute({
      tags: ['Lorebooks'],
      summary: '创建世界书及初始草稿版本',
      security: sessionSecurity,
      requestBody: jsonRequest(createSchema),
      responses: {
        201: { description: '世界书创建成功。' },
        401: problemDetailsResponseJsonSchema(401, '未登录'),
      },
    }),
    zValidator('json', createSchema, validationProblemHook()),
    async (c) => {
      const session = await c.var.di.get('auth').api.getSession({
        headers: c.req.raw.headers,
      })
      if (!session) {
        throw problems.create('UNAUTHORIZED', { detail: '未登录' })
      }

      const body = c.req.valid('json')
      const lorebook = await c.var.di
        .get('lorebookService')
        .create(body.name, body.description ?? '', new UserId(session.user.id))

      return c.json(lorebookToJson(lorebook), 201)
    },
  )

  app.get(
    '/lorebooks/:id',
    describeRoute({
      tags: ['Lorebooks'],
      summary: '获取世界书及全部版本',
      security: sessionSecurity,
      responses: {
        200: { description: '世界书详情。' },
        401: problemDetailsResponseJsonSchema(401, '未登录'),
        403: problemDetailsResponseJsonSchema(403, '无权访问该世界书'),
        404: problemDetailsResponseJsonSchema(404, '世界书不存在'),
      },
    }),
    zValidator('param', idParamSchema, validationProblemHook()),
    async (c) => {
      const session = await c.var.di.get('auth').api.getSession({
        headers: c.req.raw.headers,
      })
      if (!session) {
        throw problems.create('UNAUTHORIZED', { detail: '未登录' })
      }

      const { id } = c.req.valid('param')
      const lorebook = await c.var.di
        .get('lorebookService')
        .get(new LorebookId(id))
      if (!lorebook) {
        throw problems.create('NOT_FOUND', { detail: '世界书不存在' })
      }
      if (lorebook.ownerId.value !== session.user.id) {
        throw problems.create('FORBIDDEN', { detail: '无权访问该世界书' })
      }

      return c.json(lorebookToJson(lorebook))
    },
  )

  app.patch(
    '/lorebooks/:id',
    describeRoute({
      tags: ['Lorebooks'],
      summary: '更新世界书元数据或可见性',
      security: sessionSecurity,
      requestBody: jsonRequest(updateSchema),
      responses: {
        200: { description: '世界书更新成功。' },
        401: problemDetailsResponseJsonSchema(401, '未登录'),
        403: problemDetailsResponseJsonSchema(403, '无权修改该世界书'),
        404: problemDetailsResponseJsonSchema(404, '世界书不存在'),
        422: problemDetailsResponseJsonSchema(422, '请求或领域状态无效'),
      },
    }),
    zValidator('param', idParamSchema, validationProblemHook()),
    zValidator('json', updateSchema, validationProblemHook()),
    async (c) => {
      const session = await c.var.di.get('auth').api.getSession({
        headers: c.req.raw.headers,
      })
      if (!session) {
        throw problems.create('UNAUTHORIZED', { detail: '未登录' })
      }

      const { id } = c.req.valid('param')
      const lorebook = await c.var.di
        .get('lorebookService')
        .get(new LorebookId(id))
      if (!lorebook) {
        throw problems.create('NOT_FOUND', { detail: '世界书不存在' })
      }
      if (lorebook.ownerId.value !== session.user.id) {
        throw problems.create('FORBIDDEN', { detail: '无权修改该世界书' })
      }

      const body = c.req.valid('json')
      try {
        let updated = lorebook
        if (body.name !== undefined || body.description !== undefined) {
          updated = await c.var.di
            .get('lorebookService')
            .updateMetadata(
              updated,
              body.name ?? updated.name,
              body.description ?? updated.description,
            )
        }
        if (body.visibility !== undefined) {
          updated = await c.var.di
            .get('lorebookService')
            .changeVisibility(updated, body.visibility)
        }
        return c.json(lorebookToJson(updated))
      } catch (error) {
        throw problems.create('INVALID_STATE', {
          detail: error instanceof Error ? error.message : String(error),
        })
      }
    },
  )

  app.patch(
    '/lorebooks/:id/entries',
    describeRoute({
      tags: ['Lorebooks'],
      summary: '替换世界书草稿条目',
      security: sessionSecurity,
      requestBody: jsonRequest(entriesSchema),
      responses: {
        200: { description: '世界书条目更新成功。' },
        401: problemDetailsResponseJsonSchema(401, '未登录'),
        403: problemDetailsResponseJsonSchema(403, '无权修改该世界书'),
        404: problemDetailsResponseJsonSchema(404, '世界书不存在'),
        422: problemDetailsResponseJsonSchema(422, '请求或领域状态无效'),
      },
    }),
    zValidator('param', idParamSchema, validationProblemHook()),
    zValidator('json', entriesSchema, validationProblemHook()),
    async (c) => {
      const session = await c.var.di.get('auth').api.getSession({
        headers: c.req.raw.headers,
      })
      if (!session) {
        throw problems.create('UNAUTHORIZED', { detail: '未登录' })
      }

      const { id } = c.req.valid('param')
      const lorebook = await c.var.di
        .get('lorebookService')
        .get(new LorebookId(id))
      if (!lorebook) {
        throw problems.create('NOT_FOUND', { detail: '世界书不存在' })
      }
      if (lorebook.ownerId.value !== session.user.id) {
        throw problems.create('FORBIDDEN', { detail: '无权修改该世界书' })
      }

      const entries = c.req.valid('json').entries.map((entry) =>
        LorebookEntry.create(
          entry.keys,
          entry.title,
          entry.enabled ?? true,
          entry.content,
          entry.position,
          entry.priority ?? 0,
          {
            secondaryKeys: entry.secondaryKeys,
            matchMode: entry.matchMode,
            constant: entry.constant,
            caseSensitive: entry.caseSensitive,
            matchWholeWords: entry.matchWholeWords,
            probability: entry.probability,
            insertionDepth: entry.insertionDepth,
          },
        ),
      )

      try {
        const updated = await c.var.di
          .get('lorebookService')
          .replaceEntries(lorebook, entries)
        return c.json(lorebookToJson(updated))
      } catch (error) {
        throw problems.create('INVALID_STATE', {
          detail: error instanceof Error ? error.message : String(error),
        })
      }
    },
  )

  app.patch(
    '/lorebooks/:id/settings',
    describeRoute({
      tags: ['Lorebooks'],
      summary: '更新世界书草稿扫描设置',
      security: sessionSecurity,
      requestBody: jsonRequest(settingsSchema),
      responses: {
        200: { description: '扫描设置更新成功。' },
        401: problemDetailsResponseJsonSchema(401, '未登录'),
        403: problemDetailsResponseJsonSchema(403, '无权修改该世界书'),
        404: problemDetailsResponseJsonSchema(404, '世界书不存在'),
        422: problemDetailsResponseJsonSchema(422, '请求或领域状态无效'),
      },
    }),
    zValidator('param', idParamSchema, validationProblemHook()),
    zValidator('json', settingsSchema, validationProblemHook()),
    async (c) => {
      const session = await c.var.di.get('auth').api.getSession({
        headers: c.req.raw.headers,
      })
      if (!session) {
        throw problems.create('UNAUTHORIZED', { detail: '未登录' })
      }

      const { id } = c.req.valid('param')
      const lorebook = await c.var.di
        .get('lorebookService')
        .get(new LorebookId(id))
      if (!lorebook) {
        throw problems.create('NOT_FOUND', { detail: '世界书不存在' })
      }
      if (lorebook.ownerId.value !== session.user.id) {
        throw problems.create('FORBIDDEN', { detail: '无权修改该世界书' })
      }

      const body = c.req.valid('json')
      try {
        const updated = await c.var.di
          .get('lorebookService')
          .updateSettings(lorebook, body.scanDepth, body.tokenBudget)
        return c.json(lorebookToJson(updated))
      } catch (error) {
        throw problems.create('INVALID_STATE', {
          detail: error instanceof Error ? error.message : String(error),
        })
      }
    },
  )

  app.post(
    '/lorebooks/:id/publish',
    describeRoute({
      tags: ['Lorebooks'],
      summary: '发布世界书草稿版本',
      security: sessionSecurity,
      responses: {
        200: { description: '世界书版本发布成功。' },
        401: problemDetailsResponseJsonSchema(401, '未登录'),
        403: problemDetailsResponseJsonSchema(403, '无权发布该世界书'),
        404: problemDetailsResponseJsonSchema(404, '世界书不存在'),
        422: problemDetailsResponseJsonSchema(422, '世界书当前不可发布'),
      },
    }),
    zValidator('param', idParamSchema, validationProblemHook()),
    async (c) => {
      const session = await c.var.di.get('auth').api.getSession({
        headers: c.req.raw.headers,
      })
      if (!session) {
        throw problems.create('UNAUTHORIZED', { detail: '未登录' })
      }

      const { id } = c.req.valid('param')
      const lorebook = await c.var.di
        .get('lorebookService')
        .get(new LorebookId(id))
      if (!lorebook) {
        throw problems.create('NOT_FOUND', { detail: '世界书不存在' })
      }
      if (lorebook.ownerId.value !== session.user.id) {
        throw problems.create('FORBIDDEN', { detail: '无权发布该世界书' })
      }

      try {
        const published = await c.var.di
          .get('lorebookService')
          .publish(lorebook)
        return c.json(lorebookToJson(published))
      } catch (error) {
        throw problems.create('INVALID_STATE', {
          detail: error instanceof Error ? error.message : String(error),
        })
      }
    },
  )

  app.delete(
    '/lorebooks/:id',
    describeRoute({
      tags: ['Lorebooks'],
      summary: '删除世界书',
      security: sessionSecurity,
      responses: {
        204: { description: '世界书已删除。' },
        401: problemDetailsResponseJsonSchema(401, '未登录'),
        403: problemDetailsResponseJsonSchema(403, '无权删除该世界书'),
        404: problemDetailsResponseJsonSchema(404, '世界书不存在'),
      },
    }),
    zValidator('param', idParamSchema, validationProblemHook()),
    async (c) => {
      const session = await c.var.di.get('auth').api.getSession({
        headers: c.req.raw.headers,
      })
      if (!session) {
        throw problems.create('UNAUTHORIZED', { detail: '未登录' })
      }

      const { id } = c.req.valid('param')
      const lorebook = await c.var.di
        .get('lorebookService')
        .get(new LorebookId(id))
      if (!lorebook) {
        throw problems.create('NOT_FOUND', { detail: '世界书不存在' })
      }
      if (lorebook.ownerId.value !== session.user.id) {
        throw problems.create('FORBIDDEN', { detail: '无权删除该世界书' })
      }

      await c.var.di.get('lorebookService').remove(lorebook.id)
      return c.body(null, 204)
    },
  )
}
