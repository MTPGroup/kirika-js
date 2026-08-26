import { zValidator } from '@hono/zod-validator'
import { CharacterId } from '@kirika-js/core/domain/character'
import { LorebookId } from '@kirika-js/core/domain/lorebook'
import type { Hono } from 'hono'
import { describeRoute } from 'hono-openapi'
import { problemDetailsResponseJsonSchema } from 'hono-problem-details/openapi-json-schema'
import { z } from 'zod'
import { characterToJson } from '../character/serialize'
import type { AppEnv } from '../container'
import { idParamSchema, listQuerySchema } from '../http/openapi'
import { problems, validationProblemHook } from '../http/problems'
import { lorebookToJson } from '../lorebook/serialize'

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

  app.get(
    '/discover/lorebooks/:id',
    describeRoute({
      tags: ['Discover'],
      summary: '公开世界书详情',
      responses: {
        200: { description: '世界书详情。' },
        404: problemDetailsResponseJsonSchema(404, '世界书不存在'),
      },
    }),
    zValidator('param', idParamSchema, validationProblemHook()),
    async (c) => {
      const { id } = c.req.valid('param')
      const lorebook = await c.var.di
        .get('lorebookRepository')
        .findById(new LorebookId(id))
      if (!lorebook || lorebook.visibility === 'private') {
        throw problems.create('NOT_FOUND', { detail: '世界书不存在' })
      }
      return c.json(lorebookToJson(lorebook))
    },
  )

  app.get(
    '/discover/characters',
    describeRoute({
      tags: ['Discover'],
      summary: '公开角色发现',
      responses: {
        200: { description: '公开角色分页列表。' },
      },
    }),
    zValidator('query', listQuerySchema, validationProblemHook()),
    async (c) => {
      const { limit, offset } = c.req.valid('query')
      const result = await c.var.di
        .get('characterRepository')
        .listPublic(limit, offset)
      return c.json(result)
    },
  )

  app.get(
    '/discover/characters/:id',
    describeRoute({
      tags: ['Discover'],
      summary: '公开角色详情',
      responses: {
        200: { description: '角色详情。' },
        404: problemDetailsResponseJsonSchema(404, '角色不存在'),
      },
    }),
    zValidator('param', idParamSchema, validationProblemHook()),
    async (c) => {
      const { id } = c.req.valid('param')
      const character = await c.var.di
        .get('characterRepository')
        .findById(new CharacterId(id))
      if (!character || character.visibility === 'private') {
        throw problems.create('NOT_FOUND', { detail: '角色不存在' })
      }
      return c.json(characterToJson(character))
    },
  )
}
