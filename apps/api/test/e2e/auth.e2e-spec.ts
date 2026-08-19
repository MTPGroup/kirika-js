import 'reflect-metadata'

import type { INestApplication } from '@nestjs/common'
import { Test } from '@nestjs/testing'
import { Pool } from 'pg'
import request from 'supertest'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { AppModule } from '~/app.module'
import { APP_CONFIGURATION } from '~/shared/infrastructure/config/config.loader'
import {
	Configuration,
	configurationSchema,
} from '~/shared/infrastructure/config/config.schema'
import {
	AuthMailerService,
	VerificationOTPType,
} from '~/shared/infrastructure/mailer/auth-mailer.service'

interface SentOTP {
	email: string
	otp: string
	type: VerificationOTPType
}

function createTestConfiguration(databaseUrl: string): Configuration {
	return configurationSchema.parse({
		app: {
			name: 'Kirika Test',
			port: 3000,
		},
		database: {
			url: databaseUrl,
			poolMax: 1,
		},
		auth: {
			baseUrl: 'http://localhost:3000',
			secret: 'test-secret-that-is-at-least-32-characters-long',
			trustedOrigins: ['http://localhost:3000'],
		},
		mailer: {
			host: 'localhost',
			port: 1025,
			secure: false,
			user: 'test',
			password: 'test',
			from: 'Kirika <no-reply@kirika.test>',
		},
	})
}

describe('Auth E2E', () => {
	let app: INestApplication
	let agent: ReturnType<typeof request.agent>
	let pool: Pool
	let sentOTP: SentOTP | undefined

	const authMailerServiceMock = {
		async sendVerificationOtp(
			email: string,
			otp: string,
			type: VerificationOTPType,
		) {
			sentOTP = {
				email,
				otp,
				type,
			}
		},
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

		await app.init()

		pool = new Pool({
			connectionString: configuration.database.url,
		})
	})

	beforeEach(async () => {
		await pool.query(`
      TRUNCATE TABLE
        "verifications",
        "sessions",
        "accounts",
        "users"
      CASCADE
    `)

		sentOTP = undefined

		agent = request.agent(app.getHttpServer())
	})

	afterAll(async () => {
		await pool.end()
		await app.close()
	})

	it('完成注册 -> 验证邮箱 -> 登录 -> 读取Session -> 登出流程', async () => {
		const email = 'alice@kirika.test'
		const password = 'StrongPass123!'

		const signUpResponse = await agent.post('/api/auth/sign-up/email').send({
			name: 'Alice',
			email,
			password,
		})

		expect(signUpResponse.status).toBe(200)
		expect(signUpResponse.body.token).toBeNull()

		expect(sentOTP).toMatchObject({
			email,
			type: 'email-verification',
		})

		if (!sentOTP) {
			throw new Error('Verification OTP was not sent')
		}

		const unverfiedSignInResponse = await agent
			.post('/api/auth/sign-in/email')
			.send({
				email,
				password,
			})

		expect(unverfiedSignInResponse.status).toBe(403)

		const verificationResponse = await agent
			.post('/api/auth/email-otp/verify-email')
			.send({
				email,
				otp: sentOTP.otp,
			})

		expect(verificationResponse.status).toBe(200)
		expect(verificationResponse.body.status).toBe(true)
		expect(verificationResponse.body.user.emailVerified).toBe(true)

		const signInResponse = await agent.post('/api/auth/sign-in/email').send({
			email,
			password,
			rememberMe: true,
		})

		expect(signInResponse.status).toBe(200)
		expect(signInResponse.headers['set-cookie']).toBeDefined()

		const sessionResponse = await agent.get('/api/auth/get-session')

		expect(sessionResponse.status).toBe(200)
		expect(sessionResponse.body.user).toMatchObject({
			email,
			emailVerified: true,
		})

		const signOutResponse = await agent.post('/api/auth/sign-out')

		expect(signOutResponse.status).toBe(200)

		const expiredSessionResponse = await agent.get('/api/auth/get-session')

		expect(expiredSessionResponse.status).toBe(200)
		expect(expiredSessionResponse.body).toBeNull()
	})
})
