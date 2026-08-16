import 'dotenv/config'
import { registerAs } from '@nestjs/config'
import { z } from 'zod'

const databaseEnvironmentSchema = z.object({
	DATABASE_URL: z.string().min(1),
	DATABASE_POOL_MAX: z.coerce.number().int().positive().default(10),
})

export function parseDatabaseConfig(environment: NodeJS.ProcessEnv) {
	const result = databaseEnvironmentSchema.parse(environment)

	return {
		url: result.DATABASE_URL,
		poolMax: result.DATABASE_POOL_MAX,
	}
}

export const databaseConfig = registerAs('database', () =>
	parseDatabaseConfig(process.env),
)
