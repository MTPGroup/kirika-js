import { Module } from '@nestjs/common'
import { APP_CONFIGURATION } from './config/config.loader'
import { AppConfigModule } from './config/config.module'
import type { Configuration } from './config/config.schema'
import { DrizzleModule } from './drizzle/drizzle.module'
import { MailerModule } from './mailer/mailer.module'

@Module({
	imports: [
		AppConfigModule,
		DrizzleModule.forRootAsync({
			imports: [AppConfigModule],
			inject: [APP_CONFIGURATION],
			useFactory: (configuration: Configuration) => configuration.database,
		}),
		MailerModule,
	],
	exports: [DrizzleModule, MailerModule],
})
export class CoreModule {}
