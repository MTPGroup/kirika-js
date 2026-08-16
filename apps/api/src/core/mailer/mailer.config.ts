import { type ConfigType, registerAs } from '@nestjs/config'
import { z } from 'zod'

const mailerEnvironmentSchema = z.object({
	SMTP_HOST: z.string().min(1),
	SMTP_PORT: z.coerce.number().int().default(587),
	SMTP_SECURE: z.stringbool().default(false),
	SMTP_USER: z.string().min(1),
	SMTP_PASS: z.string().min(1),
	SMTP_FROM: z.string(),
})

function parseMailerEnvironment(environment: NodeJS.ProcessEnv) {
	const result = mailerEnvironmentSchema.parse(environment)
	return {
		transport: {
			host: result.SMTP_HOST,
			port: result.SMTP_PORT,
			secure: result.SMTP_SECURE,
			auth: {
				user: result.SMTP_USER,
				pass: result.SMTP_PASS,
			},
		},
		defaults: { from: result.SMTP_FROM },
	}
}

export const mailerConfig = registerAs('mailer', () => {
	return parseMailerEnvironment(process.env)
})

export type MailerConfig = ConfigType<typeof mailerConfig>
