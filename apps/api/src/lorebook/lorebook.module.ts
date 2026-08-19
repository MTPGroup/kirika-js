import { Module } from '@nestjs/common'
import { SharedModule } from '~/shared/shared.module'
import { CreateLorebookUseCase } from './application/use-cases/create-lorebook.use-case'
import { LOREBOOK_REPOSITORY_PORT } from './domain/ports/lorebook-repository.port'
import { DrizzleLorebookRepository } from './infrastruction/persistence/drizzle-lorebook.repository'
import { LorebookController } from './presentation/controllers/lorebook.controller'

@Module({
	imports: [SharedModule],
	providers: [
		{
			provide: LOREBOOK_REPOSITORY_PORT,
			useClass: DrizzleLorebookRepository,
		},
		CreateLorebookUseCase,
	],
	controllers: [LorebookController],
})
export class LorebookModule {}
