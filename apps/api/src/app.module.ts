import { Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { AuthModule } from '~/auth/auth.module'
import { appConfig } from './app.config'

@Module({
	imports: [
		ConfigModule.forRoot({
			isGlobal: false,
			cache: true,
		}),
		ConfigModule.forFeature(appConfig),
		AuthModule,
	],
	controllers: [],
	providers: [],
})
export class AppModule {}
