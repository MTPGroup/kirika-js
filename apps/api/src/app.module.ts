import { Module } from '@nestjs/common'
import { APP_PIPE } from '@nestjs/core'
import { ZodValidationPipe } from 'nestjs-zod'
import { AuthModule } from '~/auth/auth.module'
import { LorebookModule } from './lorebook/lorebook.module'

@Module({
	imports: [AuthModule, LorebookModule],
	controllers: [],
	providers: [
		{
			provide: APP_PIPE,
			useClass: ZodValidationPipe,
		},
	],
})
export class AppModule {}
