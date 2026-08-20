import { Module } from '@nestjs/common'
import { SharedModule } from '~/shared/shared.module'
import { CreateLorebookHandler } from './application/commands/create-lorebook.handler'
import { LOREBOOK_LIST_READ_PORT } from './application/ports/lorebook-list-read.port'
import { GetMyLorebooksHandler } from './application/queries/get-my-lorebooks.handler'
import { LOREBOOK_REPOSITORY_PORT } from './domain/ports/lorebook-repository.port'
import { DrizzleLorebookRepository } from './infrastructure/persistence/drizzle-lorebook.repository'
import { DrizzleLorebookListReadAdapter } from './infrastructure/persistence/drizzle-lorebook-list.read-adapter'
import { LorebookController } from './presentation/controllers/lorebook.controller'

@Module({
	imports: [SharedModule],
	providers: [
		{
			provide: LOREBOOK_REPOSITORY_PORT,
			useClass: DrizzleLorebookRepository,
		},
		{
			provide: LOREBOOK_LIST_READ_PORT,
			useClass: DrizzleLorebookListReadAdapter,
		},
		CreateLorebookHandler,
		GetMyLorebooksHandler,
	],
	controllers: [LorebookController],
})
export class LorebookModule {}
