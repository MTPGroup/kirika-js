import { Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { APP_PIPE } from '@nestjs/core'
import { ZodValidationPipe } from 'nestjs-zod'
import { AuthModule } from '~/auth/auth.module'
import { appConfig } from './app.config'
import { LorebookModule } from './lorebook/lorebook.module'

@Module({
	imports: [
		ConfigModule.forRoot({
			isGlobal: false,
			cache: true,
		}),
		ConfigModule.forFeature(appConfig),
		AuthModule,
		LorebookModule,
	],
	controllers: [],
	providers: [
		{
			provide: APP_PIPE,
			useClass: ZodValidationPipe,
		},
	],
})
export class AppModule {}
