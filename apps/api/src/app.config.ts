import { registerAs } from '@nestjs/config'
import { z } from 'zod'

export const appConfig = registerAs('app', () => {
	const environment = z
		.object({
			PORT: z.coerce.number().int().min(1).max(65535).default(3000),
		})
		.parse(process.env)

	return {
		port: environment.PORT,
	}
})
