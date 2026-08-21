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

interface CreatedCharacter {
	id: string
	ownerId: string
	alias: string | null
	currentRevisionId: string | null
	draftRevisionId: string
}

describe('Character E2E', () => {
	let app: INestApplication
	let pool: Pool

	const sentOtps = new Map<string, SentOTP>()

	const authMailerServiceMock = {
		async sendVerificationOtp(
			email: string,
			otp: string,
			type: VerificationOTPType,
		) {
			sentOtps.set(email, { otp, type })
		},
	}

	async function createAuthenticatedAgent(email: string, name: string) {
		const agent = request.agent(app.getHttpServer())
		const password = 'StrongPass123!'

		await agent
			.post('/api/auth/sign-up/email')
			.send({ name, email, password })
			.expect(200)

		const sentOtp = sentOtps.get(email)
		expect(sentOtp).toMatchObject({ type: 'email-verification' })
		if (!sentOtp) throw new Error(`没有收到 ${email} 的验证码`)

		await agent
			.post('/api/auth/email-otp/verify-email')
			.send({ email, otp: sentOtp.otp })
			.expect(200)

		await agent
			.post('/api/auth/sign-in/email')
			.send({ email, password, rememberMe: true })
			.expect(200)

		const sessionResponse = await agent.get('/api/auth/get-session').expect(200)

		return {
			agent,
			userId: sessionResponse.body.user.id as string,
		}
	}

	function revisionPayload(name: string) {
		return {
			name,
			description: `${name} description`,
			personality: '冷静、可靠',
			scenario: '测试场景',
			systemPrompt: '请始终保持角色设定。',
			postHistoryInstructions: '结合历史消息回答。',
			greetings: ['你好，我是 Kirika。'],
			examples: ['用户：你好\nKirika：你好。'],
			extensions: { source: 'e2e' },
			assets: [],
			lorebooks: [],
		}
	}

	async function createCharacter(
		agent: ReturnType<typeof request.agent>,
		name: string,
		alias: string | null = `${name} alias`,
	): Promise<CreatedCharacter> {
		const response = await agent
			.post('/api/v1/characters')
			.send({ alias, revision: revisionPayload(name) })
			.expect(201)

		return response.body.data as CreatedCharacter
	}

	async function createLorebookRevision(
		agent: ReturnType<typeof request.agent>,
	): Promise<string> {
		const response = await agent
			.post('/api/v1/lorebooks')
			.send({
				name: 'Character Lorebook',
				description: '角色关联世界书',
			})
			.expect(201)

		return response.body.data.draftRevisionId as string
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

		app = moduleRef.createNestApplication({ bodyParser: false })
		app.setGlobalPrefix('api')
		app.enableVersioning({
			type: VersioningType.URI,
			defaultVersion: '1',
		})
		await app.init()

		pool = new Pool({ connectionString: configuration.database.url })
	})

	beforeEach(async () => {
		await pool.query(`
			TRUNCATE TABLE
				"character_revision_assets",
				"character_revision_lorebooks",
				"character_revisions",
				"characters",
				"assets",
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

	it('未登录用户不能创建角色', async () => {
		await request(app.getHttpServer())
			.post('/api/v1/characters')
			.send({ alias: 'Unauthorized', revision: revisionPayload('Kirika') })
			.expect(401)
	})

	it('创建角色并持久化初始草稿版本', async () => {
		const { agent, userId } = await createAuthenticatedAgent(
			'alice@kirika.test',
			'Alice',
		)
		const response = await agent
			.post('/api/v1/characters')
			.send({
				alias: '桐花',
				revision: revisionPayload('Kirika'),
			})
			.expect(201)

		expect(response.body).toMatchObject({
			code: 201,
			message: 'success',
			data: {
				ownerId: userId,
				alias: '桐花',
				currentRevisionId: null,
				revisions: [
					{
						revisionNumber: 1,
						isDraft: true,
						name: 'Kirika',
						description: 'Kirika description',
						greetings: ['你好，我是 Kirika。'],
						extensions: { source: 'e2e' },
					},
				],
			},
		})
		expect(response.body.data.id).toEqual(expect.any(String))
		expect(response.body.data.draftRevisionId).toEqual(expect.any(String))
		expect(response.body.data.createdAt).toEqual(expect.any(String))
		expect(response.body.timestamp).toEqual(expect.any(Number))

		const persistenceResult = await pool.query(
			`
				SELECT
					c.id,
					c.owner_id AS "ownerId",
					c.alias,
					c.current_revision_id AS "currentRevisionId",
					r.id AS "draftRevisionId",
					r.revision_number AS "revisionNumber",
					r.is_draft AS "isDraft",
					r.name,
					r.greetings
				FROM characters c
				JOIN character_revisions r ON r.character_id = c.id
				WHERE c.id = $1
			`,
			[response.body.data.id],
		)

		expect(persistenceResult.rows).toHaveLength(1)
		expect(persistenceResult.rows[0]).toMatchObject({
			id: response.body.data.id,
			ownerId: userId,
			alias: '桐花',
			currentRevisionId: null,
			draftRevisionId: response.body.data.draftRevisionId,
			revisionNumber: 1,
			isDraft: true,
			name: 'Kirika',
			greetings: ['你好，我是 Kirika。'],
		})
	})

	it('获取角色详情并隔离其他用户数据', async () => {
		const alice = await createAuthenticatedAgent('alice@kirika.test', 'Alice')
		const bob = await createAuthenticatedAgent('bob@kirika.test', 'Bob')
		const character = await createCharacter(alice.agent, 'Kirika', '桐花')

		const response = await alice.agent
			.get(`/api/v1/characters/${character.id}`)
			.expect(200)

		expect(response.body.data).toMatchObject({
			id: character.id,
			ownerId: alice.userId,
			alias: '桐花',
			draftRevisionId: character.draftRevisionId,
			revisions: [
				{
					id: character.draftRevisionId,
					name: 'Kirika',
					isDraft: true,
				},
			],
		})

		await request(app.getHttpServer())
			.get(`/api/v1/characters/${character.id}`)
			.expect(401)
		await bob.agent.get(`/api/v1/characters/${character.id}`).expect(403)
		await alice.agent.get('/api/v1/characters/not-a-uuid').expect(400)
		await alice.agent
			.get(`/api/v1/characters/${crypto.randomUUID()}`)
			.expect(404)
	})

	it('更新角色别名并校验所有权和请求参数', async () => {
		const alice = await createAuthenticatedAgent('alice@kirika.test', 'Alice')
		const bob = await createAuthenticatedAgent('bob@kirika.test', 'Bob')
		const character = await createCharacter(alice.agent, 'Kirika', '旧别名')

		const response = await alice.agent
			.patch(`/api/v1/characters/${character.id}`)
			.send({ alias: '新别名' })
			.expect(200)

		expect(response.body.data).toMatchObject({
			id: character.id,
			alias: '新别名',
		})

		const persistenceResult = await pool.query(
			'SELECT alias FROM characters WHERE id = $1',
			[character.id],
		)
		expect(persistenceResult.rows[0]?.alias).toBe('新别名')

		await request(app.getHttpServer())
			.patch(`/api/v1/characters/${character.id}`)
			.send({ alias: 'Unauthorized' })
			.expect(401)
		await bob.agent
			.patch(`/api/v1/characters/${character.id}`)
			.send({ alias: 'Forbidden' })
			.expect(403)
		await alice.agent
			.patch(`/api/v1/characters/${character.id}`)
			.send({ alias: '   ' })
			.expect(400)
	})

	it('同步、发布角色版本并基于已发布版本创建新草稿', async () => {
		const { agent } = await createAuthenticatedAgent(
			'alice@kirika.test',
			'Alice',
		)
		const lorebookRevisionId = await createLorebookRevision(agent)
		const assetId = crypto.randomUUID()
		await pool.query(
			`
				INSERT INTO assets (id, storage_key, media_type, byte_size, sha256)
				VALUES ($1, $2, $3, $4, decode($5, 'hex'))
			`,
			[
				assetId,
				'characters/kirika/avatar.png',
				'image/png',
				1024,
				'a'.repeat(64),
			],
		)

		const character = await createCharacter(agent, 'Kirika')
		const syncedPayload = {
			...revisionPayload('Kirika Updated'),
			greetings: ['欢迎回来。', '很高兴见到你。'],
			assets: [
				{
					assetId,
					kind: 'avatar',
					name: '默认立绘',
					uri: 'asset://kirika/avatar',
					ordinal: 0,
					extensions: { expression: 'default' },
				},
			],
			lorebooks: [
				{
					lorebookRevisionId,
					ordinal: 0,
					enabled: true,
				},
			],
		}

		const synced = await agent
			.put(
				`/api/v1/characters/${character.id}/revisions/${character.draftRevisionId}`,
			)
			.send(syncedPayload)
			.expect(200)

		expect(synced.body.data).toMatchObject({
			id: character.id,
			currentRevisionId: null,
			draftRevisionId: character.draftRevisionId,
			revisions: [
				{
					id: character.draftRevisionId,
					name: 'Kirika Updated',
					greetings: ['欢迎回来。', '很高兴见到你。'],
					assets: [
						{
							assetId,
							kind: 'avatar',
							name: '默认立绘',
							ordinal: 0,
						},
					],
					lorebooks: [
						{
							lorebookRevisionId,
							ordinal: 0,
							enabled: true,
						},
					],
				},
			],
		})

		const published = await agent
			.post(
				`/api/v1/characters/${character.id}/revisions/${character.draftRevisionId}/publish`,
			)
			.expect(200)

		expect(published.body.data).toMatchObject({
			currentRevisionId: character.draftRevisionId,
			draftRevisionId: null,
			revisions: [
				{
					id: character.draftRevisionId,
					isDraft: false,
				},
			],
		})

		await agent
			.put(
				`/api/v1/characters/${character.id}/revisions/${character.draftRevisionId}`,
			)
			.send(syncedPayload)
			.expect(409)

		const newDraft = await agent
			.post(`/api/v1/characters/${character.id}/revision`)
			.expect(201)
		const secondDraftId = newDraft.body.data.draftRevisionId as string

		expect(secondDraftId).not.toBe(character.draftRevisionId)
		expect(newDraft.body.data).toMatchObject({
			currentRevisionId: character.draftRevisionId,
			revisions: [
				{
					id: character.draftRevisionId,
					revisionNumber: 1,
					isDraft: false,
				},
				{
					id: secondDraftId,
					revisionNumber: 2,
					isDraft: true,
					name: 'Kirika Updated',
					assets: [expect.objectContaining({ assetId })],
					lorebooks: [expect.objectContaining({ lorebookRevisionId })],
				},
			],
		})

		await agent.post(`/api/v1/characters/${character.id}/revision`).expect(409)

		const secondPayload = {
			...syncedPayload,
			name: 'Kirika V2',
			assets: [],
			lorebooks: [],
		}
		await agent
			.put(`/api/v1/characters/${character.id}/revisions/${secondDraftId}`)
			.send(secondPayload)
			.expect(200)
		await agent
			.post(
				`/api/v1/characters/${character.id}/revisions/${secondDraftId}/publish`,
			)
			.expect(200)

		const persistenceResult = await pool.query(
			`
				SELECT
					(SELECT COUNT(*)::int FROM character_revisions WHERE character_id = $1) AS revisions,
					(SELECT COUNT(*)::int FROM character_revision_assets a
						JOIN character_revisions r ON r.id = a.revision_id
						WHERE r.character_id = $1) AS assets,
					(SELECT COUNT(*)::int FROM character_revision_lorebooks l
						JOIN character_revisions r ON r.id = l.character_revision_id
						WHERE r.character_id = $1) AS lorebooks,
					(SELECT current_revision_id FROM characters WHERE id = $1) AS "currentRevisionId"
			`,
			[character.id],
		)

		expect(persistenceResult.rows[0]).toEqual({
			revisions: 2,
			assets: 1,
			lorebooks: 1,
			currentRevisionId: secondDraftId,
		})
	})

	it('拒绝发布没有问候语的角色草稿', async () => {
		const { agent } = await createAuthenticatedAgent(
			'alice@kirika.test',
			'Alice',
		)
		const response = await agent
			.post('/api/v1/characters')
			.send({
				alias: null,
				revision: {
					...revisionPayload('Silent Character'),
					greetings: [],
				},
			})
			.expect(201)

		await agent
			.post(
				`/api/v1/characters/${response.body.data.id}/revisions/${response.body.data.draftRevisionId}/publish`,
			)
			.expect(400)
	})

	it('仅允许所有者操作版本并删除角色关联数据', async () => {
		const alice = await createAuthenticatedAgent('alice@kirika.test', 'Alice')
		const bob = await createAuthenticatedAgent('bob@kirika.test', 'Bob')
		const character = await createCharacter(alice.agent, 'Delete Character')

		await bob.agent
			.put(
				`/api/v1/characters/${character.id}/revisions/${character.draftRevisionId}`,
			)
			.send(revisionPayload('Forbidden'))
			.expect(403)
		await bob.agent
			.post(`/api/v1/characters/${character.id}/revision`)
			.expect(403)
		await bob.agent
			.post(
				`/api/v1/characters/${character.id}/revisions/${character.draftRevisionId}/publish`,
			)
			.expect(403)
		await bob.agent.delete(`/api/v1/characters/${character.id}`).expect(403)

		await alice.agent.delete(`/api/v1/characters/${character.id}`).expect(204)
		await alice.agent.get(`/api/v1/characters/${character.id}`).expect(404)

		const persistenceResult = await pool.query(
			`
				SELECT
					(SELECT COUNT(*)::int FROM characters WHERE id = $1) AS characters,
					(SELECT COUNT(*)::int FROM character_revisions WHERE character_id = $1) AS revisions
			`,
			[character.id],
		)
		expect(persistenceResult.rows[0]).toEqual({ characters: 0, revisions: 0 })
	})

	it('分页查询当前用户角色，并优先展示草稿版本内容', async () => {
		const alice = await createAuthenticatedAgent('alice@kirika.test', 'Alice')
		const bob = await createAuthenticatedAgent('bob@kirika.test', 'Bob')
		const aliceCharacters = [
			await createCharacter(alice.agent, 'Alice Character 1'),
			await createCharacter(alice.agent, 'Alice Character 2'),
			await createCharacter(alice.agent, 'Alice Character 3'),
		]
		const bobCharacter = await createCharacter(bob.agent, 'Bob Character')

		const firstPage = await alice.agent
			.get('/api/v1/characters')
			.query({ page: 1, pageSize: 2 })
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
			expect(item.id).not.toBe(bobCharacter.id)
			expect(item.draftRevisionId).toEqual(expect.any(String))
			expect(item.name).toMatch(/^Alice Character/)
		}

		const secondPage = await alice.agent
			.get('/api/v1/characters')
			.query({ page: 2, pageSize: 2 })
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
		expect(returnedIds).toEqual(
			aliceCharacters.map((character) => character.id).sort(),
		)
	})

	it('拒绝非法创建内容和分页参数', async () => {
		const { agent } = await createAuthenticatedAgent(
			'alice@kirika.test',
			'Alice',
		)

		await agent
			.post('/api/v1/characters')
			.send({ alias: 'Invalid', revision: { name: '   ' } })
			.expect(400)
		await agent
			.get('/api/v1/characters')
			.query({ page: 0, pageSize: 20 })
			.expect(400)
		await agent
			.get('/api/v1/characters')
			.query({ page: 1, pageSize: 101 })
			.expect(400)
		await agent
			.get('/api/v1/characters')
			.query({ page: 'invalid', pageSize: 20 })
			.expect(400)
	})
})
