import { Module } from '@nestjs/common'
import { ConfigModule, type ConfigType } from '@nestjs/config'
import { AuthModule as BetterAuthModule } from '@thallesp/nestjs-better-auth'
import { DatabaseModule } from '../database/database.module'
import { DatabaseService } from '../database/database.service'
import { AuthMailerService } from '../mailer/auth-mailer.service'
import { MailerModule } from '../mailer/mailer.module'
import { authConfig } from './auth.config'
import { createAuth } from './auth.factory'

@Module({
	imports: [
		BetterAuthModule.forRootAsync({
			imports: [
				DatabaseModule,
				MailerModule,
				ConfigModule.forFeature(authConfig),
			],
			inject: [DatabaseService, authConfig.KEY, AuthMailerService],
			useFactory: (
				database: DatabaseService,
				config: ConfigType<typeof authConfig>,
				authMailerService: AuthMailerService,
			) => ({
				auth: createAuth(database.db, config, authMailerService),
			}),
		}),
	],
	exports: [BetterAuthModule],
})
export class AuthModule {}
