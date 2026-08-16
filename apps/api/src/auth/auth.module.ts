import { Module } from '@nestjs/common'
import { ConfigModule, type ConfigType } from '@nestjs/config'
import { AuthModule as BetterAuthModule } from '@thallesp/nestjs-better-auth'
import { CoreModule } from '../core/core.module'
import { DatabaseService } from '../core/database/database.service'
import { AuthMailerService } from '../core/mailer/auth-mailer.service'
import { authConfig } from './auth.config'
import { createAuth } from './auth.factory'

@Module({
	imports: [
		BetterAuthModule.forRootAsync({
			imports: [CoreModule, ConfigModule.forFeature(authConfig)],
			inject: [DatabaseService, authConfig.KEY, AuthMailerService],
			useFactory: (
				database: DatabaseService,
				config: ConfigType<typeof authConfig>,
				authMailerService: AuthMailerService,
			) => ({
				auth: createAuth(database.db, config, authMailerService),
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
