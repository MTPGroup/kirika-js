import type { Provider } from '@nestjs/common'
import type { ConfigType } from '@nestjs/config'
import { DatabaseService } from '../database/database.service'
import { AuthMailerService } from '../mailer/auth-mailer.service'
import { authConfig } from './auth.config'
import { createAuth } from './auth.factory'

export const BETTER_AUTH = Symbol('BETTER_AUTH')

export const authProvider: Provider = {
	provide: BETTER_AUTH,
	inject: [DatabaseService, authConfig.KEY, AuthMailerService],
	useFactory: (
		database: DatabaseService,
		config: ConfigType<typeof authConfig>,
		authMailerService: AuthMailerService,
	) => createAuth(database.db, config, authMailerService),
}
