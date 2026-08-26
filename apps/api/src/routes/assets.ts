import { zValidator } from '@hono/zod-validator'
import { type Asset, AssetId } from '@kirika-js/core/domain/character'
import type { Hono } from 'hono'
import { describeRoute } from 'hono-openapi'
import { problemDetailsResponseJsonSchema } from 'hono-problem-details/openapi-json-schema'
import type { AppEnv } from '../container'
import { idParamSchema, sessionSecurity } from '../http/openapi'
import { problems, validationProblemHook } from '../http/problems'

function assetToJson(asset: Asset) {
  return {
    id: asset.id.value,
    mediaType: asset.mediaType,
    byteSize: asset.byteSize,
    sha256: asset.sha256,
  }
}

export function mountAssetRoutes(app: Hono<AppEnv>): void {
  app.post(
    '/assets',
    describeRoute({
      tags: ['Assets'],
      summary: '上传资产（头像、背景、立绘等）',
      security: sessionSecurity,
      responses: {
        201: { description: '资产上传成功。' },
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
        .upload({ data: bytes, mediaType })

      return c.json(assetToJson(asset), 201)
    },
  )

  app.get(
    '/assets/:id',
    describeRoute({
      tags: ['Assets'],
      summary: '获取资产内容',
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
      const asset = await c.var.di
        .get('assetRepository')
        .findById(new AssetId(id))
      if (!asset) {
        throw problems.create('NOT_FOUND', { detail: '资产不存在' })
      }
      if (!asset.storageKey) {
        throw problems.create('INVALID_STATE', { detail: '资产缺少存储键' })
      }

      const data = await c.var.di.get('objectStorage').get(asset.storageKey)
      return new Response(Buffer.from(data), {
        headers: {
          'content-type': asset.mediaType ?? 'application/octet-stream',
        },
      })
    },
  )
}
