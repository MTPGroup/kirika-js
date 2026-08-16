import { Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { MailerModule as MMailerModule } from '@nestjs-modules/mailer'
import { AuthMailerService } from './auth-mailer.service'
import { type MailerConfig, mailerConfig } from './mailer.config'
import { createMailerOptions } from './mailer.factory'

@Module({
	imports: [
		MMailerModule.forRootAsync({
			imports: [ConfigModule.forFeature(mailerConfig)],
			inject: [mailerConfig.KEY],
			useFactory: (config: MailerConfig) => {
				return createMailerOptions(config)
			},
		}),
	],
	providers: [AuthMailerService],
	exports: [AuthMailerService],
})
export class MailerModule {}
