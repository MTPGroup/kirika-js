import { drizzleAdapter } from '@better-auth/drizzle-adapter/relations-v2'
import { betterAuth } from 'better-auth/minimal'
import { emailOTP, openAPI } from 'better-auth/plugins'
import * as schema from '~/core/drizzle/drizzle.drizzle-schema'
import type { DrizzleService } from '~/core/drizzle/drizzle.service'
import type { AuthMailerService } from '~/core/mailer/auth-mailer.service'
import type { AuthOptions } from './auth.types'

export function createAuth(
	database: DrizzleService['db'],
	options: AuthOptions,
	authMailerService: Pick<AuthMailerService, 'sendVerificationOtp'>,
) {
	return betterAuth({
		baseURL: options.baseUrl,
		secret: options.secret,
		trustedOrigins: options.trustedOrigins,

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
