import { zValidator } from '@hono/zod-validator'
import {
  type EncodedCharacterCard,
  fromCharacterRevision,
  toCharacterRevisionContent,
} from '@kirika-js/core/character-card'
import {
  AssetId,
  CharacterId,
  CharacterLorebookReference,
  CharacterRevisionAsset,
  type CharacterRevisionContent,
} from '@kirika-js/core/domain/character'
import {
  LorebookEntry,
  LorebookRevisionId,
} from '@kirika-js/core/domain/lorebook'
import { UserId } from '@kirika-js/core/domain/shared'
import type { Hono } from 'hono'
import { describeRoute } from 'hono-openapi'
import { problemDetailsResponseJsonSchema } from 'hono-problem-details/openapi-json-schema'
import { z } from 'zod'
import { cardCodecRegistry } from '../character/card-codec'
import { characterToJson } from '../character/serialize'
import type { AppEnv } from '../container'
import {
  idParamSchema,
  jsonRequest,
  listQuerySchema,
  sessionSecurity,
} from '../http/openapi'
import { problems, validationProblemHook } from '../http/problems'

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
  assets: z
    .array(
      z.object({
        assetId: z.uuid(),
        kind: z.enum([
          'avatar',
          'background',
          'emotion',
          'audio',
          'video',
          'model',
          'other',
        ]),
        name: z.string().trim().min(1),
        uri: z.string().trim().min(1),
        ordinal: z.number().int().min(0),
        extensions: z.record(z.string(), z.unknown()).optional(),
      }),
    )
    .optional(),
  lorebooks: z
    .array(
      z.object({
        lorebookRevisionId: z.uuid(),
        ordinal: z.number().int().min(0),
        enabled: z.boolean().optional(),
      }),
    )
    .optional(),
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

const exportCardQuerySchema = z.object({
  format: z
    .enum(['kirika-json', 'kirika-png', 'json', 'png', 'charx', 'voxta'])
    .default('kirika-json'),
})

export function mountCharacterRoutes(app: Hono<AppEnv>): void {
  app.get(
    '/characters',
    describeRoute({
      tags: ['Characters'],
      summary: '角色列表',
      security: sessionSecurity,
      responses: {
        200: { description: '角色分页列表。' },
        401: problemDetailsResponseJsonSchema(401, '未登录'),
      },
    }),
    zValidator('query', listQuerySchema, validationProblemHook()),
    async (c) => {
      const session = await c.var.di.get('auth').api.getSession({
        headers: c.req.raw.headers,
      })
      if (!session) {
        throw problems.create('UNAUTHORIZED', { detail: '未登录' })
      }

      const { limit, offset } = c.req.valid('query')
      const result = await c.var.di
        .get('characterRepository')
        .listByOwner(session.user.id, limit, offset)
      return c.json(result)
    },
  )

  app.post(
    '/characters/import',
    describeRoute({
      tags: ['Characters'],
      summary: '导入角色卡（自动识别 PNG/CharX/Voxta/JSON）',
      security: sessionSecurity,
      responses: {
        201: { description: '角色导入成功。' },
        401: problemDetailsResponseJsonSchema(401, '未登录'),
        422: problemDetailsResponseJsonSchema(422, '导入失败'),
      },
    }),
    async (c) => {
      const session = await c.var.di.get('auth').api.getSession({
        headers: c.req.raw.headers,
      })
      if (!session) {
        throw problems.create('UNAUTHORIZED', { detail: '未登录' })
      }

      const form = await c.req.formData()
      const file = form.get('file')
      if (!(file instanceof File)) {
        throw problems.create('INVALID_STATE', { detail: '缺少 file 字段' })
      }

      const data = new Uint8Array(await file.arrayBuffer())
      const assetService = c.var.di.get('assetService')
      const lorebookService = c.var.di.get('lorebookService')

      let content: CharacterRevisionContent
      try {
        const imported = await cardCodecRegistry.importCard({
          data,
          mediaType: file.type || 'application/octet-stream',
          fileName: file.name,
        })
        content = await toCharacterRevisionContent(imported.card, {
          importAsset: async (asset) => {
            if (!asset.data) {
              throw new Error(`资产 ${asset.name} 缺少内嵌数据`)
            }
            const uploaded = await assetService.upload({
              data: asset.data,
              mediaType: asset.mediaType ?? 'application/octet-stream',
            })
            return {
              assetId: uploaded.id,
              uri: asset.uri ?? `asset://${uploaded.id.value}`,
              extensions: asset.extensions,
            }
          },
          importLorebook: async (lorebook) => {
            const created = await lorebookService.create(
              lorebook.name ?? 'Imported Lorebook',
              lorebook.description ?? '',
              new UserId(session.user.id),
            )
            const entries = lorebook.entries.map((entry) =>
              LorebookEntry.create(
                [...entry.keys],
                entry.title,
                entry.enabled,
                entry.content,
                entry.position,
                entry.priority,
                {
                  secondaryKeys: [...entry.secondaryKeys],
                  constant: entry.constant,
                  matchMode: entry.matchMode,
                  caseSensitive: entry.caseSensitive,
                  matchWholeWords: entry.matchWholeWords,
                  probability: entry.probability,
                  insertionDepth: entry.insertionDepth,
                },
              ),
            )
            const updated = await lorebookService.replaceEntries(
              created,
              entries,
            )
            if (!updated.draftRevision) {
              throw new Error('导入世界书缺少草稿版本')
            }
            return updated.draftRevision.id
          },
        })
      } catch (error) {
        throw problems.create('INVALID_STATE', {
          detail: error instanceof Error ? error.message : '角色卡导入失败',
        })
      }

      const character = await c.var.di
        .get('characterService')
        .create(new UserId(session.user.id), { content })

      return c.json(characterToJson(character), 201)
    },
  )

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
      const session = await c.var.di.get('auth').api.getSession({
        headers: c.req.raw.headers,
      })
      if (!session) {
        throw problems.create('UNAUTHORIZED', { detail: '未登录' })
      }

      const { alias, assets, lorebooks, ...content } = c.req.valid('json')
      const character = await c.var.di
        .get('characterService')
        .create(new UserId(session.user.id), {
          alias: alias ?? null,
          content: {
            ...content,
            assets: assets?.map(
              (asset) =>
                new CharacterRevisionAsset({
                  assetId: new AssetId(asset.assetId),
                  kind: asset.kind,
                  name: asset.name,
                  uri: asset.uri,
                  ordinal: asset.ordinal,
                  extensions: asset.extensions,
                }),
            ),
            lorebooks: lorebooks?.map(
              (reference) =>
                new CharacterLorebookReference({
                  lorebookRevisionId: new LorebookRevisionId(
                    reference.lorebookRevisionId,
                  ),
                  ordinal: reference.ordinal,
                  enabled: reference.enabled,
                }),
            ),
          },
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
      const session = await c.var.di.get('auth').api.getSession({
        headers: c.req.raw.headers,
      })
      if (!session) {
        throw problems.create('UNAUTHORIZED', { detail: '未登录' })
      }

      const { id } = c.req.valid('param')
      const character = await c.var.di
        .get('characterService')
        .get(new CharacterId(id))
      if (!character) {
        throw problems.create('NOT_FOUND', { detail: '角色不存在' })
      }
      if (character.ownerId.value !== session.user.id) {
        throw problems.create('FORBIDDEN', { detail: '无权访问该角色' })
      }

      return c.json(characterToJson(character))
    },
  )

  app.get(
    '/characters/:id/export',
    describeRoute({
      tags: ['Characters'],
      summary: '导出角色卡（JSON/PNG/CharX/Voxta）',
      security: sessionSecurity,
      responses: {
        200: { description: '角色卡二进制内容。' },
        401: problemDetailsResponseJsonSchema(401, '未登录'),
        403: problemDetailsResponseJsonSchema(403, '无权访问该角色'),
        404: problemDetailsResponseJsonSchema(404, '角色不存在'),
        422: problemDetailsResponseJsonSchema(422, '格式或资源不支持'),
      },
    }),
    zValidator('param', idParamSchema, validationProblemHook()),
    zValidator('query', exportCardQuerySchema, validationProblemHook()),
    async (c) => {
      const session = await c.var.di.get('auth').api.getSession({
        headers: c.req.raw.headers,
      })
      if (!session) {
        throw problems.create('UNAUTHORIZED', { detail: '未登录' })
      }

      const { id } = c.req.valid('param')
      const { format } = c.req.valid('query')
      const character = await c.var.di
        .get('characterRepository')
        .findById(new CharacterId(id))
      if (!character) {
        throw problems.create('NOT_FOUND', { detail: '角色不存在' })
      }
      if (character.ownerId.value !== session.user.id) {
        throw problems.create('FORBIDDEN', { detail: '无权访问该角色' })
      }

      const revision = character.currentRevision ?? character.draftRevision
      if (!revision) {
        throw problems.create('INVALID_STATE', {
          detail: '角色没有可导出的版本',
        })
      }

      const lorebookRepository = c.var.di.get('lorebookRepository')
      const card = await fromCharacterRevision(revision, {
        exportAsset: async (asset) => {
          const stored = await c.var.di
            .get('assetRepository')
            .findById(asset.assetId)
          if (!stored?.storageKey) return { uri: asset.uri }
          const data = await c.var.di
            .get('objectStorage')
            .get(stored.storageKey)
          return {
            uri: asset.uri,
            mediaType: stored.mediaType ?? undefined,
            data,
          }
        },
        exportLorebook: async (reference) => {
          const lorebook = await lorebookRepository.findById(
            reference.lorebookRevisionId,
          )
          if (!lorebook) return { name: '', description: '', entries: [] }
          const rev = lorebook.currentRevision ?? lorebook.draftRevision
          return {
            name: lorebook.name,
            description: lorebook.description,
            entries:
              rev?.entries.map((entry) => ({
                keys: [...entry.keys],
                secondaryKeys: [...entry.secondaryKeys],
                title: entry.title,
                enabled: entry.enabled,
                constant: entry.constant,
                content: entry.content,
                position: entry.position,
                insertionDepth: entry.insertionDepth,
                priority: entry.priority,
                matchMode: entry.matchMode,
                caseSensitive: entry.caseSensitive,
                matchWholeWords: entry.matchWholeWords,
                probability: entry.probability,
              })) ?? [],
          }
        },
      })

      let encoded: EncodedCharacterCard
      try {
        encoded = await cardCodecRegistry.exportCard(card, format)
      } catch (error) {
        throw problems.create('INVALID_STATE', {
          detail: error instanceof Error ? error.message : '角色卡导出失败',
        })
      }

      const filename = `${character.alias ?? revision.name}.${encoded.fileExtension ?? format}`
      return new Response(Buffer.from(encoded.data), {
        headers: {
          'content-type': encoded.mediaType,
          'content-disposition': `attachment; filename="${encodeURIComponent(filename)}"`,
        },
      })
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
      const session = await c.var.di.get('auth').api.getSession({
        headers: c.req.raw.headers,
      })
      if (!session) {
        throw problems.create('UNAUTHORIZED', { detail: '未登录' })
      }

      const { id } = c.req.valid('param')
      const character = await c.var.di
        .get('characterService')
        .get(new CharacterId(id))
      if (!character) {
        throw problems.create('NOT_FOUND', { detail: '角色不存在' })
      }
      if (character.ownerId.value !== session.user.id) {
        throw problems.create('FORBIDDEN', { detail: '无权修改该角色' })
      }

      try {
        const updated = await c.var.di
          .get('characterService')
          .updateDraft(character, c.req.valid('json'))
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
      const session = await c.var.di.get('auth').api.getSession({
        headers: c.req.raw.headers,
      })
      if (!session) {
        throw problems.create('UNAUTHORIZED', { detail: '未登录' })
      }

      const { id } = c.req.valid('param')
      const character = await c.var.di
        .get('characterService')
        .get(new CharacterId(id))
      if (!character) {
        throw problems.create('NOT_FOUND', { detail: '角色不存在' })
      }
      if (character.ownerId.value !== session.user.id) {
        throw problems.create('FORBIDDEN', { detail: '无权发布该角色' })
      }

      try {
        const published = await c.var.di
          .get('characterService')
          .publish(character)
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
      const session = await c.var.di.get('auth').api.getSession({
        headers: c.req.raw.headers,
      })
      if (!session) {
        throw problems.create('UNAUTHORIZED', { detail: '未登录' })
      }

      const { id } = c.req.valid('param')
      const character = await c.var.di
        .get('characterService')
        .get(new CharacterId(id))
      if (!character) {
        throw problems.create('NOT_FOUND', { detail: '角色不存在' })
      }
      if (character.ownerId.value !== session.user.id) {
        throw problems.create('FORBIDDEN', { detail: '无权删除该角色' })
      }

      await c.var.di.get('characterService').remove(character.id)
      return c.body(null, 204)
    },
  )
}
