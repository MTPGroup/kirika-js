import { CharacterId } from '@kirika-js/core/domain/character'
import { LorebookId } from '@kirika-js/core/domain/lorebook'
import type { Hono } from 'hono'
import { describeRoute, validator as zValidator } from 'hono-openapi'
import { problemDetailsResponseJsonSchema } from 'hono-problem-details/openapi-json-schema'
import { z } from 'zod'
import { characterToJson } from '../character/serialize'
import type { AppEnv } from '../container'
import { idParamSchema, jsonResponse, listQuerySchema } from '../http/openapi'
import { problems, validationProblemHook } from '../http/problems'
import { lorebookToJson } from '../lorebook/serialize'

const discoverLorebookQuerySchema = listQuerySchema.extend({
  q: z.string().trim().min(1).max(100).optional(),
})

const discoverCharacterQuerySchema = listQuerySchema.extend({
  q: z.string().trim().min(1).max(100).optional(),
})

const discoverLorebookListItemJsonSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  visibility: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
})

const discoverLorebookListJsonSchema = z.object({
  items: z.array(discoverLorebookListItemJsonSchema),
  total: z.number(),
  hasMore: z.boolean(),
})

const discoverLorebookEntryJsonSchema = z.object({
  id: z.string(),
  keys: z.array(z.string()),
  secondaryKeys: z.array(z.string()),
  title: z.string(),
  enabled: z.boolean(),
  content: z.string(),
  position: z.string(),
  priority: z.number(),
  matchMode: z.string(),
  constant: z.boolean(),
  caseSensitive: z.boolean(),
  matchWholeWords: z.boolean(),
  probability: z.number(),
  insertionDepth: z.number(),
})

const discoverLorebookRevisionJsonSchema = z.object({
  id: z.string(),
  revisionNumber: z.number(),
  isDraft: z.boolean(),
  scanDepth: z.number(),
  tokenBudget: z.number(),
  entries: z.array(discoverLorebookEntryJsonSchema),
})

const discoverLorebookJsonSchema = z.object({
  id: z.string(),
  ownerId: z.string(),
  name: z.string(),
  description: z.string(),
  visibility: z.string(),
  currentRevisionId: z.string().nullable(),
  revisions: z.array(discoverLorebookRevisionJsonSchema),
  createdAt: z.string(),
  updatedAt: z.string(),
})

const discoverCharacterListItemJsonSchema = z.object({
  id: z.string(),
  alias: z.string().nullable(),
  name: z.string().nullable(),
  currentRevisionId: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
})

const discoverCharacterListJsonSchema = z.object({
  items: z.array(discoverCharacterListItemJsonSchema),
  total: z.number(),
  hasMore: z.boolean(),
})

const discoverCharacterAssetJsonSchema = z.object({
  assetId: z.string(),
  kind: z.string(),
  name: z.string(),
  uri: z.string(),
  ordinal: z.number(),
  extensions: z.record(z.string(), z.unknown()),
})

const discoverCharacterLorebookRefJsonSchema = z.object({
  lorebookRevisionId: z.string(),
  ordinal: z.number(),
  enabled: z.boolean(),
})

const discoverCharacterRevisionJsonSchema = z.object({
  id: z.string(),
  revisionNumber: z.number(),
  isDraft: z.boolean(),
  name: z.string(),
  description: z.string(),
  personality: z.string(),
  scenario: z.string(),
  systemPrompt: z.string(),
  postHistoryInstructions: z.string(),
  greetings: z.array(z.string()),
  examples: z.array(z.string()),
  extensions: z.record(z.string(), z.unknown()),
  assets: z.array(discoverCharacterAssetJsonSchema),
  lorebooks: z.array(discoverCharacterLorebookRefJsonSchema),
  createdAt: z.string(),
  updatedAt: z.string(),
})

const discoverCharacterJsonSchema = z.object({
  id: z.string(),
  ownerId: z.string(),
  alias: z.string().nullable(),
  visibility: z.string(),
  currentRevisionId: z.string().nullable(),
  revisions: z.array(discoverCharacterRevisionJsonSchema),
  createdAt: z.string(),
  updatedAt: z.string(),
})

export function mountDiscoverRoutes(app: Hono<AppEnv>): void {
  app.get(
    '/discover/lorebooks',
    describeRoute({
      tags: ['Discover'],
      summary: '公开世界书发现与搜索',
      responses: {
        200: jsonResponse(
          discoverLorebookListJsonSchema,
          '公开世界书分页列表。',
        ),
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
        200: jsonResponse(discoverLorebookJsonSchema, '世界书详情。'),
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
        200: jsonResponse(
          discoverCharacterListJsonSchema,
          '公开角色分页列表。',
        ),
      },
    }),
    zValidator('query', discoverCharacterQuerySchema, validationProblemHook()),
    async (c) => {
      const { limit, offset, q } = c.req.valid('query')
      const result = await c.var.di
        .get('characterRepository')
        .listPublic(limit, offset, q)
      return c.json(result)
    },
  )

  app.get(
    '/discover/characters/:id',
    describeRoute({
      tags: ['Discover'],
      summary: '公开角色详情',
      responses: {
        200: jsonResponse(discoverCharacterJsonSchema, '角色详情。'),
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
