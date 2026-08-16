import { Module } from '@nestjs/common'
import { AuthModule as BetterAuthModule } from '@thallesp/nestjs-better-auth'
import { APP_CONFIGURATION } from '~/core/config/config.loader'
import { AppConfigModule } from '~/core/config/config.module'
import type { Configuration } from '~/core/config/config.schema'
import { CoreModule } from '~/core/core.module'
import { DrizzleService } from '~/core/drizzle/drizzle.service'
import { AuthMailerService } from '~/core/mailer/auth-mailer.service'
import { createAuth } from './auth.factory'

@Module({
	imports: [
		BetterAuthModule.forRootAsync({
			imports: [CoreModule, AppConfigModule],
			inject: [DrizzleService, APP_CONFIGURATION, AuthMailerService],
			useFactory: (
				database: DrizzleService,
				configuration: Configuration,
				authMailerService: AuthMailerService,
			) => ({
				auth: createAuth(database.db, configuration.auth, authMailerService),
				bodyParser: {
					json: { limit: '2mb' },
					urlencoded: { limit: '2mb', extended: true },
					rawBody: true,
				},
			}),
		}),
	],
	exports: [BetterAuthModule],
})
export class AuthModule {}
