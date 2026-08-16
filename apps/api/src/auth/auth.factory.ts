import { drizzleAdapter } from '@better-auth/drizzle-adapter/relations-v2'
import type { ConfigType } from '@nestjs/config'
import { betterAuth } from 'better-auth/minimal'
import { emailOTP, openAPI } from 'better-auth/plugins'
import type { DatabaseService } from '../core/database/database.service'
import * as schema from '../core/database/schema'
import type { AuthMailerService } from '../core/mailer/auth-mailer.service'
import type { authConfig } from './auth.config'

export function createAuth(
	database: DatabaseService['db'],
	config: ConfigType<typeof authConfig>,
	authMailerService: Pick<AuthMailerService, 'sendVerificationOtp'>,
) {
	return betterAuth({
		baseURL: config.baseUrl,
		secret: config.secret,
		trustedOrigins: config.trustedOrigins,

		database: drizzleAdapter(database, {
			provider: 'pg',
			schema,
			usePlural: true,
		}),

		experimental: {
			joins: true,
		},

		emailAndPassword: {
			enabled: true,
			requireEmailVerification: true,
		},

		plugins: [
			openAPI(),
			emailOTP({
				storeOTP: 'hashed',
				overrideDefaultEmailVerification: true,

				async sendVerificationOTP({ email, otp, type }) {
					await authMailerService.sendVerificationOtp(email, otp, type)
				},
			}),
		],
	})
}

export type Auth = ReturnType<typeof createAuth>
