import { CHARACTER_REPOSITORY_PORT } from '@kirika-js/domain/character'
import { Module } from '@nestjs/common'
import { SharedModule } from '~/shared/shared.module'
import { CreateCharacterHandler } from './application/commands/create-character.handler'
import { CreateCharacterRevisionHandler } from './application/commands/create-character-revision.handler'
import { DeleteCharacterHandler } from './application/commands/delete-character.handler'
import { PublishCharacterRevisionHandler } from './application/commands/publish-character-revision.handler'
import { SyncCharacterRevisionHandler } from './application/commands/sync-character-revision.handler'
import { UpdateCharacterHandler } from './application/commands/update-character.handler'
import { CHARACTER_LIST_READ_PORT } from './application/ports/character-list-read.port'
import { GetCharacterHandler } from './application/queries/get-character.handler'
import { GetMyCharactersHandler } from './application/queries/get-my-characters.handler'
import { DrizzleCharacterRepository } from './infrastructure/persistence/drizzle-character.repository'
import { DrizzleCharacterListReadAdapter } from './infrastructure/persistence/drizzle-character-list.read-adapter'
import { CharacterController } from './presentation/controllers/character.controller'

@Module({
  imports: [SharedModule],
  providers: [
    {
      provide: CHARACTER_REPOSITORY_PORT,
      useClass: DrizzleCharacterRepository,
    },
    {
      provide: CHARACTER_LIST_READ_PORT,
      useClass: DrizzleCharacterListReadAdapter,
    },
    GetCharacterHandler,
    GetMyCharactersHandler,
    CreateCharacterHandler,
    CreateCharacterRevisionHandler,
    DeleteCharacterHandler,
    PublishCharacterRevisionHandler,
    SyncCharacterRevisionHandler,
    UpdateCharacterHandler,
  ],
  controllers: [CharacterController],
})
export class CharacterModule {}
