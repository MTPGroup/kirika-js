import { inject } from 'vitest'

process.env.NODE_ENV = 'test'
process.env.DATABASE_URL = inject('databaseUrl')

Object.assign(process.env, {
	BETTER_AUTH_SECRET: 'test-secret-that-is-at-least-32-characters-long',
	BETTER_AUTH_URL: 'http://localhost:3000',
	TRUST_ORIGINS: '["http://localhost:3000"]',

	PORT: '3000',

	SMTP_HOST: 'localhost',
	SMTP_PORT: '1025',
	SMTP_SECURE: 'false',
	SMTP_USER: 'test',
	SMTP_PASS: 'test',
	SMTP_FROM: 'Kirika <no-reply@kirika.test>',
})
