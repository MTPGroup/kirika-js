import { Module } from '@nestjs/common'
import { SharedModule } from '~/shared/shared.module'
import { CreateLorebookHandler } from './application/commands/create-lorebook.handler'
import { LOREBOOK_REPOSITORY_PORT } from './domain/ports/lorebook-repository.port'
import { DrizzleLorebookRepository } from './infrastructure/persistence/drizzle-lorebook.repository'
import { LorebookController } from './presentation/controllers/lorebook.controller'

@Module({
	imports: [SharedModule],
	providers: [
		{
			provide: LOREBOOK_REPOSITORY_PORT,
			useClass: DrizzleLorebookRepository,
		},
		CreateLorebookHandler,
	],
	controllers: [LorebookController],
})
export class LorebookModule {}
