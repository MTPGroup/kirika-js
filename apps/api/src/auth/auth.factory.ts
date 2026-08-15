import { drizzleAdapter } from '@better-auth/drizzle-adapter/relations-v2'
import type { ConfigType } from '@nestjs/config'
import { betterAuth } from 'better-auth/minimal'
import { openAPI } from 'better-auth/plugins'
import type { DatabaseService } from '../database/database.service'
import * as schema from '../database/schema'
import type { authConfig } from './auth.config'

export function createAuth(
	database: DatabaseService['db'],
	config: ConfigType<typeof authConfig>,
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
		},

		plugins: [openAPI()],
	})
}

export type Auth = ReturnType<typeof createAuth>
