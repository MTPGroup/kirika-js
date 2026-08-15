import { Module } from '@nestjs/common'
import { ConfigModule, type ConfigType } from '@nestjs/config'
import { AuthModule as BetterAuthModule } from '@thallesp/nestjs-better-auth'
import { DatabaseModule } from '../database/database.module'
import { DatabaseService } from '../database/database.service'
import { authConfig } from './auth.config'
import { createAuth } from './auth.factory'

@Module({
	imports: [
		BetterAuthModule.forRootAsync({
			imports: [DatabaseModule, ConfigModule.forFeature(authConfig)],
			inject: [DatabaseService, authConfig.KEY],
			useFactory: (
				database: DatabaseService,
				config: ConfigType<typeof authConfig>,
			) => ({
				auth: createAuth(database.db, config),
			}),
		}),
	],
	exports: [BetterAuthModule],
})
export class AuthModule {}
