import { LOREBOOK_REPOSITORY_PORT } from '@kirika-js/domain/lorebook'
import { Module } from '@nestjs/common'
import { SharedModule } from '~/shared/shared.module'
import { CreateLorebookHandler } from './application/commands/create-lorebook.handler'
import { CreateLorebookRevisionHandler } from './application/commands/create-lorebook-revision.handler'
import { DeleteLorebookHandler } from './application/commands/delete-lorebook.handler'
import { PublishLorebookRevisionHandler } from './application/commands/publish-lorebook-revision.handler'
import { SyncLorebookEntriesHandler } from './application/commands/sync-lorebook-entries.handler'
import { UpdateLorebookHandler } from './application/commands/update-lorebook.handler'
import { LOREBOOK_LIST_READ_PORT } from './application/ports/lorebook-list-read.port'
import { GetPublicLorebookHandler } from './application/queries/get-available-lorebooks.handler'
import { GetLorebookHandler } from './application/queries/get-lorebook.handler'
import { GetMyLorebooksHandler } from './application/queries/get-my-lorebooks.handler'
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
		CreateLorebookRevisionHandler,
		DeleteLorebookHandler,
		PublishLorebookRevisionHandler,
		SyncLorebookEntriesHandler,
		UpdateLorebookHandler,
		GetPublicLorebookHandler,
		GetLorebookHandler,
		GetMyLorebooksHandler,
	],
	controllers: [LorebookController],
})
export class LorebookModule {}
