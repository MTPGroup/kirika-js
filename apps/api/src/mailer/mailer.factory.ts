import { join } from 'node:path'
import type { MailerOptions } from '@nestjs-modules/mailer'
import { HandlebarsAdapter } from '@nestjs-modules/mailer/adapters/handlebars.adapter'
import type { MailerConfig } from './mailer.config'

export const createMailerOptions = (config: MailerConfig): MailerOptions => ({
	transport: config.transport,
	defaults: config.defaults,
	template: {
		dir: join(__dirname, 'templates'),
		adapter: new HandlebarsAdapter(undefined, {
			inlineCssEnabled: true,
		}),
		options: {
			strict: true,
		},
	},
})
