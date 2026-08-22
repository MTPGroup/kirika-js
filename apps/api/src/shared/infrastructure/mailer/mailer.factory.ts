import { join } from 'node:path'
import type { MailerOptions } from '@nestjs-modules/mailer'
import { HandlebarsAdapter } from '@nestjs-modules/mailer/adapters/handlebars.adapter'
import type { MailerConfig } from './mailer.config'

export const createMailerOptions = (config: MailerConfig): MailerOptions => ({
  transport: {
    host: config.host,
    port: config.port,
    secure: config.secure,
    auth: {
      user: config.user,
      pass: config.password,
    },
  },
  defaults: {
    from: config.from,
  },
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
