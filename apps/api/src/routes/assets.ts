import { type Asset, AssetId } from '@kirika-js/core/domain/character'
import type { ObjectStoragePort } from '@kirika-js/core/storage'
import type { Hono } from 'hono'
import { describeRoute, validator as zValidator } from 'hono-openapi'
import { problemDetailsResponseJsonSchema } from 'hono-problem-details/openapi-json-schema'
import { z } from 'zod'
import type { AppEnv } from '../container'
import {
  idParamSchema,
  jsonResponse,
  listQuerySchema,
  sessionSecurity,
} from '../http/openapi'
import { problems, validationProblemHook } from '../http/problems'

async function assetToJson(asset: Asset, storage: ObjectStoragePort) {
  return {
    id: asset.id.value,
    mediaType: asset.mediaType,
    byteSize: asset.byteSize,
    sha256: asset.sha256,
    url: asset.storageKey ? await storage.getPublicUrl(asset.storageKey) : null,
  }
}

const assetJsonSchema = z.object({
  id: z.string(),
  mediaType: z.string().nullable(),
  byteSize: z.number().nullable(),
  sha256: z.string().nullable(),
  url: z.string().nullable(),
})

const assetListJsonSchema = z.object({
  items: z.array(
    z.object({
      id: z.string(),
      mediaType: z.string().nullable(),
      byteSize: z.number().nullable(),
      sha256: z.string().nullable(),
      createdAt: z.string(),
      url: z.string().nullable(),
    }),
  ),
  hasMore: z.boolean(),
})

export function mountAssetRoutes(app: Hono<AppEnv>): void {
  app.get(
    '/assets',
    describeRoute({
      tags: ['Assets'],
      summary: '我的资产列表',
      security: sessionSecurity,
      responses: {
        200: jsonResponse(assetListJsonSchema, '资产分页列表。'),
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
      const storage = c.var.di.get('objectStorage')
      const result = await c.var.di
        .get('assetRepository')
        .listByOwner(session.user.id, limit, offset)
      const items = await Promise.all(
        result.items.map(async (item) => ({
          id: item.id,
          mediaType: item.mediaType,
          byteSize: item.byteSize,
          sha256: item.sha256,
          createdAt: item.createdAt,
          url: item.storageKey
            ? await storage.getPublicUrl(item.storageKey)
            : null,
        })),
      )
      return c.json({ items, hasMore: result.hasMore })
    },
  )

  app.post(
    '/assets',
    describeRoute({
      tags: ['Assets'],
      summary: '上传资产（头像、背景、立绘等）',
      security: sessionSecurity,
      responses: {
        201: jsonResponse(assetJsonSchema, '资产上传成功。'),
        401: problemDetailsResponseJsonSchema(401, '未登录'),
        422: problemDetailsResponseJsonSchema(422, '请求无效'),
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

      const bytes = new Uint8Array(await file.arrayBuffer())
      const mediaType = file.type || 'application/octet-stream'
      const asset = await c.var.di
        .get('assetService')
        .upload(session.user.id, { data: bytes, mediaType })

      return c.json(
        await assetToJson(asset, c.var.di.get('objectStorage')),
        201,
      )
    },
  )

  app.get(
    '/assets/:id',
    describeRoute({
      tags: ['Assets'],
      summary: '获取自己的资产内容',
      security: sessionSecurity,
      responses: {
        200: { description: '资产二进制内容。' },
        401: problemDetailsResponseJsonSchema(401, '未登录'),
        404: problemDetailsResponseJsonSchema(404, '资产不存在'),
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
      const repository = c.var.di.get('assetRepository')
      if (!(await repository.isOwnedBy(id, session.user.id))) {
        throw problems.create('NOT_FOUND', { detail: '资产不存在' })
      }

      const asset = await repository.findById(new AssetId(id))
      if (!asset?.storageKey) {
        throw problems.create('NOT_FOUND', { detail: '资产不存在' })
      }

      const data = await c.var.di.get('objectStorage').get(asset.storageKey)
      return new Response(Buffer.from(data), {
        headers: {
          'content-type': asset.mediaType ?? 'application/octet-stream',
        },
      })
    },
  )

  app.delete(
    '/assets/:id',
    describeRoute({
      tags: ['Assets'],
      summary: '删除自己的未引用资产',
      security: sessionSecurity,
      responses: {
        204: { description: '资产已删除。' },
        401: problemDetailsResponseJsonSchema(401, '未登录'),
        404: problemDetailsResponseJsonSchema(404, '资产不存在'),
        409: problemDetailsResponseJsonSchema(409, '资产仍被角色引用'),
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
      const repository = c.var.di.get('assetRepository')
      if (!(await repository.isOwnedBy(id, session.user.id))) {
        throw problems.create('NOT_FOUND', { detail: '资产不存在' })
      }
      if (await repository.isReferenced(id)) {
        throw problems.create('CONFLICT', {
          detail: '资产仍被角色版本引用，无法删除',
        })
      }

      const asset = await repository.findById(new AssetId(id))
      await repository.revokeOwnership(id, session.user.id)
      if (!(await repository.hasOwners(id))) {
        if (asset?.storageKey) {
          await c.var.di.get('objectStorage').delete(asset.storageKey)
        }
        if (asset) await repository.delete(asset.id)
      }

      return c.body(null, 204)
    },
  )
}
