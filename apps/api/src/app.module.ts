import { Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { appConfig } from './app.config'
import { AuthModule } from './auth/auth.module'
import { DatabaseModule } from './database/database.module'
import { MailerModule } from './mailer/mailer.module'

@Module({
	imports: [
		ConfigModule.forRoot({
			isGlobal: false,
			cache: true,
		}),
		ConfigModule.forFeature(appConfig),
		DatabaseModule,
		MailerModule,
		AuthModule,
	],
	controllers: [],
	providers: [],
})
export class AppModule {}
