import { Module } from '@nestjs/common'
import { AuthModule as BetterAuthModule } from '@thallesp/nestjs-better-auth'
import { APP_CONFIGURATION } from '~/shared/infrastructure/config/config.loader'
import { Configuration } from '~/shared/infrastructure/config/config.schema'
import { DrizzleService } from '~/shared/infrastructure/drizzle/drizzle.service'
import { AuthMailerService } from '~/shared/infrastructure/mailer/auth-mailer.service'
import { SharedModule } from '~/shared/shared.module'
import { createAuth } from './auth.factory'

@Module({
	imports: [
		BetterAuthModule.forRootAsync({
			imports: [SharedModule],
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
