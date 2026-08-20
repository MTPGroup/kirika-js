import { Module } from '@nestjs/common'
import { APP_PIPE } from '@nestjs/core'
import { CqrsModule } from '@nestjs/cqrs'
import { ZodValidationPipe } from 'nestjs-zod'
import { AuthModule } from '~/auth/auth.module'
import { LorebookModule } from './lorebook/lorebook.module'
import { SharedModule } from './shared/shared.module'

@Module({
	imports: [CqrsModule.forRoot(), SharedModule, AuthModule, LorebookModule],
	controllers: [],
	providers: [
		{
			provide: APP_PIPE,
			useClass: ZodValidationPipe,
		},
	],
})
export class AppModule {}
