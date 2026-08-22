import 'reflect-metadata'

import { type INestApplication, VersioningType } from '@nestjs/common'
import { Test } from '@nestjs/testing'
import { Pool } from 'pg'
import request from 'supertest'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { AppModule } from '~/app.module'
import { APP_CONFIGURATION } from '~/shared/infrastructure/config/config.loader'
import {
  AuthMailerService,
  type VerificationOTPType,
} from '~/shared/infrastructure/mailer/auth-mailer.service'
import { createTestConfiguration } from '../helpers/test-config'

interface SentOTP {
  otp: string
  type: VerificationOTPType
}

describe('Lorebook E2E', () => {
  let app: INestApplication
  let pool: Pool

  const sentOtps = new Map<string, SentOTP>()

  const authMailerServiceMock = {
    async sendVerificationOtp(
      email: string,
      otp: string,
      type: VerificationOTPType,
    ) {
      sentOtps.set(email, {
        otp,
        type,
      })
    },
  }

  async function createAuthenticatedAgent(email: string, name: string) {
    const agent = request.agent(app.getHttpServer())
    const password = 'StrongPass123!'

    await agent
      .post('/api/auth/sign-up/email')
      .send({
        name,
        email,
        password,
      })
      .expect(200)

    const sentOtp = sentOtps.get(email)

    expect(sentOtp).toMatchObject({
      type: 'email-verification',
    })

    if (!sentOtp) {
      throw new Error(`没有收到 ${email} 的验证码`)
    }

    await agent
      .post('/api/auth/email-otp/verify-email')
      .send({
        email,
        otp: sentOtp.otp,
      })
      .expect(200)

    await agent
      .post('/api/auth/sign-in/email')
      .send({
        email,
        password,
        rememberMe: true,
      })
      .expect(200)

    const sessionResponse = await agent.get('/api/auth/get-session').expect(200)

    return {
      agent,
      userId: sessionResponse.body.user.id as string,
    }
  }

  async function createLorebook(
    agent: ReturnType<typeof request.agent>,
    name: string,
    description = `${name} description`,
  ) {
    const response = await agent
      .post('/api/v1/lorebooks')
      .send({
        name,
        description,
      })
      .expect(201)

    return response.body.data as {
      id: string
      ownerId: string
      name: string
      description: string
      draftRevisionId: string
      currentRevisionId: string | null
    }
  }

  beforeAll(async () => {
    const databaseUrl = process.env.DATABASE_URL

    if (!databaseUrl) {
      throw new Error('DATABASE_URL was not provided by Vitest global setup')
    }

    const configuration = createTestConfiguration(databaseUrl)

    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(APP_CONFIGURATION)
      .useValue(configuration)
      .overrideProvider(AuthMailerService)
      .useValue(authMailerServiceMock)
      .compile()

    app = moduleRef.createNestApplication({
      bodyParser: false,
    })

    app.setGlobalPrefix('api')
    app.enableVersioning({
      type: VersioningType.URI,
      defaultVersion: '1',
    })

    await app.init()

    pool = new Pool({
      connectionString: configuration.database.url,
    })
  })

  beforeEach(async () => {
    await pool.query(`
			TRUNCATE TABLE
				"lorebook_entries",
				"lorebook_revisions",
				"lorebooks",
				"verifications",
				"sessions",
				"accounts",
				"users"
			CASCADE
		`)

    sentOtps.clear()
  })

  afterAll(async () => {
    await pool.end()
    await app.close()
  })

  it('未登录用户不能创建世界书', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/lorebooks')
      .send({
        name: 'Unauthorized lorebook',
        description: 'Should not be created',
      })
      .expect(401)
  })

  it('创建世界书并持久化初始草稿版本', async () => {
    const { agent, userId } = await createAuthenticatedAgent(
      'alice@kirika.test',
      'Alice',
    )

    const response = await agent
      .post('/api/v1/lorebooks')
      .send({
        name: '艾尔登世界',
        description: '用于记录艾尔登世界设定',
      })
      .expect(201)

    expect(response.body).toMatchObject({
      code: 201,
      message: 'success',
      data: {
        ownerId: userId,
        name: '艾尔登世界',
        description: '用于记录艾尔登世界设定',
        currentRevisionId: null,
      },
    })

    expect(response.body.data.id).toEqual(expect.any(String))
    expect(response.body.data.draftRevisionId).toEqual(expect.any(String))
    expect(response.body.timestamp).toEqual(expect.any(Number))

    const persistenceResult = await pool.query(
      `
				SELECT
					l.id,
					l.owner_id AS "ownerId",
					l.name,
					l.description,
					l.visibility,
					l.current_revision_id AS "currentRevisionId",
					r.id AS "draftRevisionId",
					r.is_draft AS "isDraft"
				FROM lorebooks l
				LEFT JOIN lorebook_revisions r
					ON r.lorebook_id = l.id
				WHERE l.id = $1
			`,
      [response.body.data.id],
    )

    expect(persistenceResult.rows).toHaveLength(1)
    expect(persistenceResult.rows[0]).toMatchObject({
      id: response.body.data.id,
      ownerId: userId,
      name: '艾尔登世界',
      description: '用于记录艾尔登世界设定',
      visibility: 'private',
      currentRevisionId: null,
      draftRevisionId: response.body.data.draftRevisionId,
      isDraft: true,
    })
  })

  it('获取指定世界书及其草稿条目', async () => {
    const { agent, userId } = await createAuthenticatedAgent(
      'alice@kirika.test',
      'Alice',
    )
    const lorebook = await createLorebook(agent, '艾尔登世界', '交界地设定')
    const entryId = crypto.randomUUID()

    await pool.query(
      `
				INSERT INTO lorebook_entries (
					id,
					revision_id,
					keys,
					title,
					enabled,
					content,
					position,
					priority
				) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
			`,
      [
        entryId,
        lorebook.draftRevisionId,
        JSON.stringify(['黄金树', '褪色者']),
        '黄金树',
        true,
        '黄金树是交界地秩序的象征。',
        'before_history',
        10,
      ],
    )

    const response = await agent
      .get(`/api/v1/lorebooks/${lorebook.id}`)
      .expect(200)

    expect(response.body).toMatchObject({
      code: 200,
      message: 'success',
      data: {
        id: lorebook.id,
        ownerId: userId,
        name: '艾尔登世界',
        description: '交界地设定',
        visibility: 'private',
        currentRevisionId: null,
        draftRevisionId: lorebook.draftRevisionId,
        revisions: [
          {
            id: lorebook.draftRevisionId,
            revisionNumber: 1,
            isDraft: true,
            entries: [
              {
                id: entryId,
                keys: ['黄金树', '褪色者'],
                title: '黄金树',
                enabled: true,
                content: '黄金树是交界地秩序的象征。',
                position: 'before_history',
                priority: 10,
              },
            ],
          },
        ],
      },
    })
    expect(response.body.data.createdAt).toEqual(expect.any(String))
    expect(response.body.data.updatedAt).toEqual(expect.any(String))
    expect(response.body.timestamp).toEqual(expect.any(Number))
  })

  it('隐藏其他用户的私有世界书', async () => {
    const alice = await createAuthenticatedAgent('alice@kirika.test', 'Alice')
    const bob = await createAuthenticatedAgent('bob@kirika.test', 'Bob')
    const lorebook = await createLorebook(alice.agent, 'Private Lorebook')

    await bob.agent.get(`/api/v1/lorebooks/${lorebook.id}`).expect(404)
  })

  it('获取指定世界书时校验登录状态和 UUID', async () => {
    const { agent } = await createAuthenticatedAgent(
      'alice@kirika.test',
      'Alice',
    )
    const lorebook = await createLorebook(agent, 'Private Lorebook')

    await request(app.getHttpServer())
      .get(`/api/v1/lorebooks/${lorebook.id}`)
      .expect(401)

    await agent.get('/api/v1/lorebooks/not-a-uuid').expect(400)
    await agent.get(`/api/v1/lorebooks/${crypto.randomUUID()}`).expect(404)
  })

  it('部分更新世界书元数据并持久化', async () => {
    const { agent, userId } = await createAuthenticatedAgent(
      'alice@kirika.test',
      'Alice',
    )
    const lorebook = await createLorebook(agent, '旧名称', '保留的描述')

    const response = await agent
      .patch(`/api/v1/lorebooks/${lorebook.id}`)
      .send({
        name: '新名称',
      })
      .expect(200)

    expect(response.body).toMatchObject({
      code: 200,
      message: 'success',
      data: {
        id: lorebook.id,
        ownerId: userId,
        name: '新名称',
        description: '保留的描述',
        visibility: 'private',
        currentRevisionId: null,
      },
    })
    expect(response.body.data.createdAt).toEqual(expect.any(String))
    expect(response.body.data.updatedAt).toEqual(expect.any(String))
    expect(response.body.timestamp).toEqual(expect.any(Number))

    const persistenceResult = await pool.query(
      `
				SELECT name, description, visibility
				FROM lorebooks
				WHERE id = $1
			`,
      [lorebook.id],
    )

    expect(persistenceResult.rows[0]).toMatchObject({
      name: '新名称',
      description: '保留的描述',
      visibility: 'private',
    })
  })

  it('仅允许所有者更新世界书并校验请求参数', async () => {
    const alice = await createAuthenticatedAgent('alice@kirika.test', 'Alice')
    const bob = await createAuthenticatedAgent('bob@kirika.test', 'Bob')
    const lorebook = await createLorebook(alice.agent, 'Private Lorebook')

    await request(app.getHttpServer())
      .patch(`/api/v1/lorebooks/${lorebook.id}`)
      .send({ name: 'Unauthorized' })
      .expect(401)

    await bob.agent
      .patch(`/api/v1/lorebooks/${lorebook.id}`)
      .send({ name: 'Forbidden' })
      .expect(403)

    await alice.agent
      .patch(`/api/v1/lorebooks/${lorebook.id}`)
      .send({})
      .expect(400)

    await alice.agent
      .patch(`/api/v1/lorebooks/${lorebook.id}`)
      .send({ name: '   ' })
      .expect(400)

    await alice.agent
      .patch(`/api/v1/lorebooks/${lorebook.id}`)
      .send({ visibility: 'invalid' })
      .expect(400)

    await alice.agent
      .patch(`/api/v1/lorebooks/${crypto.randomUUID()}`)
      .send({ name: 'Missing' })
      .expect(404)
  })

  it('仅允许存在已发布版本的世界书对外可见', async () => {
    const { agent } = await createAuthenticatedAgent(
      'alice@kirika.test',
      'Alice',
    )
    const lorebook = await createLorebook(agent, 'Visibility Lorebook')

    await agent
      .patch(`/api/v1/lorebooks/${lorebook.id}`)
      .send({ visibility: 'public' })
      .expect(400)

    await pool.query(
      `
				UPDATE lorebook_revisions
				SET is_draft = false
				WHERE id = $1
			`,
      [lorebook.draftRevisionId],
    )
    await pool.query(
      `
				UPDATE lorebooks
				SET current_revision_id = $1
				WHERE id = $2
			`,
      [lorebook.draftRevisionId, lorebook.id],
    )

    const response = await agent
      .patch(`/api/v1/lorebooks/${lorebook.id}`)
      .send({ visibility: 'public' })
      .expect(200)

    expect(response.body.data).toMatchObject({
      id: lorebook.id,
      visibility: 'public',
      currentRevisionId: lorebook.draftRevisionId,
    })

    const persistenceResult = await pool.query(
      `
				SELECT visibility
				FROM lorebooks
				WHERE id = $1
			`,
      [lorebook.id],
    )
    expect(persistenceResult.rows[0]?.visibility).toBe('public')
  })

  it('同步、发布世界书版本并基于已发布版本创建新草稿', async () => {
    const { agent } = await createAuthenticatedAgent(
      'alice@kirika.test',
      'Alice',
    )
    const lorebook = await createLorebook(agent, 'Lifecycle Lorebook')

    const synced = await agent
      .put(
        `/api/v1/lorebooks/${lorebook.id}/revisions/${lorebook.draftRevisionId}/entries`,
      )
      .send({
        entries: [
          {
            keys: ['黄金树', '褪色者'],
            title: '黄金树',
            content: '黄金树是交界地秩序的象征。',
            priority: 10,
          },
        ],
      })
      .expect(200)

    expect(synced.body.data).toMatchObject({
      lorebookId: lorebook.id,
      id: lorebook.draftRevisionId,
      revisionNumber: 1,
      isDraft: true,
      currentRevisionId: null,
      entries: [
        {
          keys: ['黄金树', '褪色者'],
          title: '黄金树',
          enabled: true,
          content: '黄金树是交界地秩序的象征。',
          position: 'after_history',
          priority: 10,
        },
      ],
    })
    const initialEntryId = synced.body.data.entries[0].id as string

    const published = await agent
      .post(
        `/api/v1/lorebooks/${lorebook.id}/revisions/${lorebook.draftRevisionId}/publish`,
      )
      .expect(200)

    expect(published.body.data).toMatchObject({
      id: lorebook.draftRevisionId,
      isDraft: false,
      currentRevisionId: lorebook.draftRevisionId,
    })

    await agent
      .put(
        `/api/v1/lorebooks/${lorebook.id}/revisions/${lorebook.draftRevisionId}/entries`,
      )
      .send({ entries: [] })
      .expect(409)

    const createdDraft = await agent
      .post(`/api/v1/lorebooks/${lorebook.id}/revision`)
      .expect(201)

    expect(createdDraft.body.data).toMatchObject({
      lorebookId: lorebook.id,
      revisionNumber: 2,
      isDraft: true,
      currentRevisionId: lorebook.draftRevisionId,
    })
    expect(createdDraft.body.data.entries).toHaveLength(1)
    expect(createdDraft.body.data.entries[0].id).not.toBe(initialEntryId)
    const secondDraftId = createdDraft.body.data.id as string

    await agent.post(`/api/v1/lorebooks/${lorebook.id}/revision`).expect(409)

    const updatedDraft = await agent
      .put(
        `/api/v1/lorebooks/${lorebook.id}/revisions/${secondDraftId}/entries`,
      )
      .send({
        entries: [
          {
            id: createdDraft.body.data.entries[0].id,
            keys: ['黄金律法'],
            title: '黄金律法',
            enabled: false,
            content: '更新后的条目内容。',
            position: 'before_history',
            priority: 20,
          },
        ],
      })
      .expect(200)

    expect(updatedDraft.body.data.entries).toEqual([
      expect.objectContaining({
        keys: ['黄金律法'],
        title: '黄金律法',
        enabled: false,
        position: 'before_history',
        priority: 20,
      }),
    ])

    await agent
      .post(
        `/api/v1/lorebooks/${lorebook.id}/revisions/${secondDraftId}/publish`,
      )
      .expect(200)

    const persistenceResult = await pool.query(
      `
				SELECT
					(SELECT COUNT(*)::int FROM lorebook_revisions WHERE lorebook_id = $1) AS revisions,
					(SELECT COUNT(*)::int FROM lorebook_entries e
						JOIN lorebook_revisions r ON r.id = e.revision_id
						WHERE r.lorebook_id = $1) AS entries,
					(SELECT current_revision_id FROM lorebooks WHERE id = $1) AS "currentRevisionId"
			`,
      [lorebook.id],
    )

    expect(persistenceResult.rows[0]).toMatchObject({
      revisions: 2,
      entries: 2,
      currentRevisionId: secondDraftId,
    })
  })

  it('仅允许所有者操作版本并删除世界书及其关联数据', async () => {
    const alice = await createAuthenticatedAgent('alice@kirika.test', 'Alice')
    const bob = await createAuthenticatedAgent('bob@kirika.test', 'Bob')
    const lorebook = await createLorebook(alice.agent, 'Delete Lorebook')

    await bob.agent
      .put(
        `/api/v1/lorebooks/${lorebook.id}/revisions/${lorebook.draftRevisionId}/entries`,
      )
      .send({ entries: [] })
      .expect(403)

    await bob.agent
      .post(`/api/v1/lorebooks/${lorebook.id}/revision`)
      .expect(403)

    await bob.agent
      .post(
        `/api/v1/lorebooks/${lorebook.id}/revisions/${lorebook.draftRevisionId}/publish`,
      )
      .expect(403)

    await bob.agent.delete(`/api/v1/lorebooks/${lorebook.id}`).expect(403)
    await alice.agent.delete(`/api/v1/lorebooks/${lorebook.id}`).expect(204)
    await alice.agent.get(`/api/v1/lorebooks/${lorebook.id}`).expect(404)

    const persistenceResult = await pool.query(
      `
				SELECT
					(SELECT COUNT(*)::int FROM lorebooks WHERE id = $1) AS lorebooks,
					(SELECT COUNT(*)::int FROM lorebook_revisions WHERE lorebook_id = $1) AS revisions
			`,
      [lorebook.id],
    )

    expect(persistenceResult.rows[0]).toEqual({
      lorebooks: 0,
      revisions: 0,
    })
  })

  it('分页查询当前用户的世界书，并隔离其他用户数据', async () => {
    const alice = await createAuthenticatedAgent('alice@kirika.test', 'Alice')
    const bob = await createAuthenticatedAgent('bob@kirika.test', 'Bob')

    const aliceLorebooks = [
      await createLorebook(alice.agent, 'Alice Lorebook 1'),
      await createLorebook(alice.agent, 'Alice Lorebook 2'),
      await createLorebook(alice.agent, 'Alice Lorebook 3'),
    ]

    const bobLorebook = await createLorebook(bob.agent, 'Bob Lorebook')

    const firstPage = await alice.agent
      .get('/api/v1/lorebooks')
      .query({
        page: 1,
        pageSize: 2,
      })
      .expect(200)

    expect(firstPage.body).toMatchObject({
      code: 200,
      message: 'success',
      data: {
        pagination: {
          page: 1,
          pageSize: 2,
          total: 3,
          totalPages: 2,
          hasPreviousPage: false,
          hasNextPage: true,
        },
      },
    })

    expect(firstPage.body.data.items).toHaveLength(2)

    for (const item of firstPage.body.data.items) {
      expect(item.ownerId).toBe(alice.userId)
      expect(item.id).not.toBe(bobLorebook.id)
    }

    const secondPage = await alice.agent
      .get('/api/v1/lorebooks')
      .query({
        page: 2,
        pageSize: 2,
      })
      .expect(200)

    expect(secondPage.body.data.items).toHaveLength(1)
    expect(secondPage.body.data.pagination).toMatchObject({
      page: 2,
      pageSize: 2,
      total: 3,
      totalPages: 2,
      hasPreviousPage: true,
      hasNextPage: false,
    })

    const returnedIds = [
      ...firstPage.body.data.items,
      ...secondPage.body.data.items,
    ]
      .map((item: { id: string }) => item.id)
      .sort()

    const expectedIds = aliceLorebooks.map((item) => item.id).sort()

    expect(returnedIds).toEqual(expectedIds)
  })

  it('拒绝非法分页参数', async () => {
    const { agent } = await createAuthenticatedAgent(
      'alice@kirika.test',
      'Alice',
    )

    await agent
      .get('/api/v1/lorebooks')
      .query({
        page: 0,
        pageSize: 20,
      })
      .expect(400)

    await agent
      .get('/api/v1/lorebooks')
      .query({
        page: 1,
        pageSize: 101,
      })
      .expect(400)

    await agent
      .get('/api/v1/lorebooks')
      .query({
        page: 'invalid',
        pageSize: 20,
      })
      .expect(400)
  })
})
