import { zValidator } from '@hono/zod-validator'
import { CharacterId } from '@kirika-js/core/domain/character'
import { UserId } from '@kirika-js/core/domain/shared'
import type { Hono } from 'hono'
import { describeRoute } from 'hono-openapi'
import { problemDetailsResponseJsonSchema } from 'hono-problem-details/openapi-json-schema'
import { z } from 'zod'
import type { CharacterService } from '../character/character.service'
import { characterToJson } from '../character/serialize'
import type { Auth } from '../lib/auth'
import type { AppEnv } from '../lib/logger'
import { idParamSchema, jsonRequest, sessionSecurity } from './openapi'
import { problems, validationProblemHook } from './problems'

const createSchema = z.object({
  alias: z.string().trim().min(1).max(200).optional(),
  name: z.string().trim().min(1),
  description: z.string().optional(),
  personality: z.string().optional(),
  scenario: z.string().optional(),
  systemPrompt: z.string().optional(),
  postHistoryInstructions: z.string().optional(),
  greetings: z.array(z.string()).optional(),
  examples: z.array(z.string()).optional(),
  extensions: z.record(z.string(), z.unknown()).optional(),
})

const updateSchema = z.object({
  name: z.string().trim().min(1).optional(),
  description: z.string().optional(),
  personality: z.string().optional(),
  scenario: z.string().optional(),
  systemPrompt: z.string().optional(),
  postHistoryInstructions: z.string().optional(),
  extensions: z.record(z.string(), z.unknown()).optional(),
})

export interface CharacterRouteDependencies {
  readonly auth: Auth
  readonly service: CharacterService
}

export function mountCharacterRoutes(
  app: Hono<AppEnv>,
  deps: CharacterRouteDependencies,
): void {
  app.post(
    '/characters',
    describeRoute({
      tags: ['Characters'],
      summary: '创建角色及初始草稿版本',
      security: sessionSecurity,
      requestBody: jsonRequest(createSchema),
      responses: {
        201: { description: '角色创建成功。' },
        401: problemDetailsResponseJsonSchema(401, '未登录'),
      },
    }),
    zValidator('json', createSchema, validationProblemHook()),
    async (c) => {
      const session = await deps.auth.api.getSession({
        headers: c.req.raw.headers,
      })
      if (!session) {
        throw problems.create('UNAUTHORIZED', { detail: '未登录' })
      }

      const { alias, ...content } = c.req.valid('json')
      const character = await deps.service.create(new UserId(session.user.id), {
        alias: alias ?? null,
        content,
      })

      return c.json(characterToJson(character), 201)
    },
  )

  app.get(
    '/characters/:id',
    describeRoute({
      tags: ['Characters'],
      summary: '获取角色及全部版本',
      security: sessionSecurity,
      responses: {
        200: { description: '角色详情。' },
        401: problemDetailsResponseJsonSchema(401, '未登录'),
        403: problemDetailsResponseJsonSchema(403, '无权访问该角色'),
        404: problemDetailsResponseJsonSchema(404, '角色不存在'),
      },
    }),
    zValidator('param', idParamSchema, validationProblemHook()),
    async (c) => {
      const session = await deps.auth.api.getSession({
        headers: c.req.raw.headers,
      })
      if (!session) {
        throw problems.create('UNAUTHORIZED', { detail: '未登录' })
      }

      const { id } = c.req.valid('param')
      const character = await deps.service.get(new CharacterId(id))
      if (!character) {
        throw problems.create('NOT_FOUND', { detail: '角色不存在' })
      }
      if (character.ownerId.value !== session.user.id) {
        throw problems.create('FORBIDDEN', { detail: '无权访问该角色' })
      }

      return c.json(characterToJson(character))
    },
  )

  app.patch(
    '/characters/:id',
    describeRoute({
      tags: ['Characters'],
      summary: '更新角色草稿版本',
      security: sessionSecurity,
      requestBody: jsonRequest(updateSchema),
      responses: {
        200: { description: '草稿更新成功。' },
        401: problemDetailsResponseJsonSchema(401, '未登录'),
        403: problemDetailsResponseJsonSchema(403, '无权修改该角色'),
        404: problemDetailsResponseJsonSchema(404, '角色不存在'),
        422: problemDetailsResponseJsonSchema(422, '请求或领域状态无效'),
      },
    }),
    zValidator('param', idParamSchema, validationProblemHook()),
    zValidator('json', updateSchema, validationProblemHook()),
    async (c) => {
      const session = await deps.auth.api.getSession({
        headers: c.req.raw.headers,
      })
      if (!session) {
        throw problems.create('UNAUTHORIZED', { detail: '未登录' })
      }

      const { id } = c.req.valid('param')
      const character = await deps.service.get(new CharacterId(id))
      if (!character) {
        throw problems.create('NOT_FOUND', { detail: '角色不存在' })
      }
      if (character.ownerId.value !== session.user.id) {
        throw problems.create('FORBIDDEN', { detail: '无权修改该角色' })
      }

      try {
        const updated = await deps.service.updateDraft(
          character,
          c.req.valid('json'),
        )
        return c.json(characterToJson(updated))
      } catch (error) {
        throw problems.create('INVALID_STATE', {
          detail: error instanceof Error ? error.message : String(error),
        })
      }
    },
  )

  app.post(
    '/characters/:id/publish',
    describeRoute({
      tags: ['Characters'],
      summary: '发布角色草稿版本',
      security: sessionSecurity,
      responses: {
        200: { description: '角色版本发布成功。' },
        401: problemDetailsResponseJsonSchema(401, '未登录'),
        403: problemDetailsResponseJsonSchema(403, '无权发布该角色'),
        404: problemDetailsResponseJsonSchema(404, '角色不存在'),
        422: problemDetailsResponseJsonSchema(422, '角色当前不可发布'),
      },
    }),
    zValidator('param', idParamSchema, validationProblemHook()),
    async (c) => {
      const session = await deps.auth.api.getSession({
        headers: c.req.raw.headers,
      })
      if (!session) {
        throw problems.create('UNAUTHORIZED', { detail: '未登录' })
      }

      const { id } = c.req.valid('param')
      const character = await deps.service.get(new CharacterId(id))
      if (!character) {
        throw problems.create('NOT_FOUND', { detail: '角色不存在' })
      }
      if (character.ownerId.value !== session.user.id) {
        throw problems.create('FORBIDDEN', { detail: '无权发布该角色' })
      }

      try {
        const published = await deps.service.publish(character)
        return c.json(characterToJson(published))
      } catch (error) {
        throw problems.create('INVALID_STATE', {
          detail: error instanceof Error ? error.message : String(error),
        })
      }
    },
  )

  app.delete(
    '/characters/:id',
    describeRoute({
      tags: ['Characters'],
      summary: '删除角色',
      security: sessionSecurity,
      responses: {
        204: { description: '角色已删除。' },
        401: problemDetailsResponseJsonSchema(401, '未登录'),
        403: problemDetailsResponseJsonSchema(403, '无权删除该角色'),
        404: problemDetailsResponseJsonSchema(404, '角色不存在'),
      },
    }),
    zValidator('param', idParamSchema, validationProblemHook()),
    async (c) => {
      const session = await deps.auth.api.getSession({
        headers: c.req.raw.headers,
      })
      if (!session) {
        throw problems.create('UNAUTHORIZED', { detail: '未登录' })
      }

      const { id } = c.req.valid('param')
      const character = await deps.service.get(new CharacterId(id))
      if (!character) {
        throw problems.create('NOT_FOUND', { detail: '角色不存在' })
      }
      if (character.ownerId.value !== session.user.id) {
        throw problems.create('FORBIDDEN', { detail: '无权删除该角色' })
      }

      await deps.service.remove(character.id)
      return c.body(null, 204)
    },
  )
}
