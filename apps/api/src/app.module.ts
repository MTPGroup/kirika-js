import { Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { appConfig } from './app.config'
import { DatabaseModule } from './database/database.module';

@Module({
	imports: [
		ConfigModule.forRoot({
			isGlobal: false,
			cache: true,
		}),
		ConfigModule.forFeature(appConfig),
		DatabaseModule,
	],
	controllers: [],
	providers: [],
})
export class AppModule {}
