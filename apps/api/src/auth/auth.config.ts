import { registerAs } from '@nestjs/config'
import { z } from 'zod'

const authEnvironmentSchema = z.object({
	BETTER_AUTH_SECRET: z.string().min(32),
	BETTER_AUTH_URL: z.url(),
	TRUST_ORIGINS: z
		.string()
		.transform((value, context) => {
			try {
				return JSON.parse(value)
			} catch {
				context.addIssue({
					code: 'custom',
					message: 'TRUST_ORIGINS must be a valid JSON array',
				})
			}

			return z.NEVER
		})
		.pipe(z.url().array().min(1)),
})

export function parseAuthConfig(environment: NodeJS.ProcessEnv) {
	const result = authEnvironmentSchema.parse(environment)

	return {
		baseUrl: result.BETTER_AUTH_URL,
		secret: result.BETTER_AUTH_SECRET,
		trustedOrigins: result.TRUST_ORIGINS,
	}
}

export const authConfig = registerAs('auth', () =>
	parseAuthConfig(process.env),
)
