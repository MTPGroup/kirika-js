import { registerAs } from '@nestjs/config'
import { z } from 'zod'

export const databaseConfig = registerAs('database', () => {
	const environment = z
		.object({
			DATABASE_URL: z.string().min(1),
			DATABASE_POOL_MAX: z.coerce.number().int().positive().default(10),
		})
		.parse(process.env)

	return {
		url: environment.DATABASE_URL,
		poolMax: environment.DATABASE_POOL_MAX,
	}
})
