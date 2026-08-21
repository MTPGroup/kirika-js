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
