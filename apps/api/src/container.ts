import type { InferdiHonoEnv } from '@inferdi/hono'
import { Container } from '@inferdi/inferdi'
import { OpenAICompatibleChatModel } from '@kirika-js/adapter-model-openai-compatible'
import type { HonoLogLayerVariables } from '@loglayer/hono'
import { PgCharacterRepository } from './character/character.repository'
import { CharacterService } from './character/character.service'
import { PgCharacterContextResolver } from './character/context-resolver'
import { ChatService } from './chat/chat.service'
import { loadConfiguration } from './config/loader'
import { PgConversationRepository } from './conversation/conversation.repository'
import { PgConversationMessageRepository } from './conversation/conversation-message.repository'
import { createAuth } from './lib/auth'
import { createDb } from './lib/db'
import { PgLorebookRepository } from './lorebook/lorebook.repository'
import { LorebookService } from './lorebook/lorebook.service'

export interface RequestContext {
  readonly requestId: string
}

export function buildRootContainer() {
  return new Container()
    .declareScopeInputs<{ request: RequestContext }>()
    .registerValue('config', loadConfiguration())
    .registerFactory('db', (container) => {
      const config = container.get('config')
      return createDb(config.database.url, config.database.poolMax)
    })
    .registerFactory('auth', (container) => {
      const config = container.get('config')
      return createAuth(container.get('db'), config.auth)
    })
    .registerFactory('model', (container) => {
      const config = container.get('config')
      return new OpenAICompatibleChatModel({
        baseUrl: config.model.baseUrl,
        apiKey: config.model.apiKey,
      })
    })
    .registerClass('conversationRepository', PgConversationRepository, ['db'])
    .registerClass(
      'conversationMessageRepository',
      PgConversationMessageRepository,
      ['db'],
    )
    .registerClass('characterRepository', PgCharacterRepository, ['db'])
    .registerClass('lorebookRepository', PgLorebookRepository, ['db'])
    .registerClass('characterContextResolver', PgCharacterContextResolver, [
      'db',
    ])
    .registerFactory('chatService', (container) => {
      const config = container.get('config')
      return new ChatService({
        model: container.get('model'),
        characterContextResolver: container.get('characterContextResolver'),
        conversationRepository: container.get('conversationRepository'),
        messageRepository: container.get('conversationMessageRepository'),
        defaultModel: config.model.defaultModel,
      })
    })
    .registerClass('characterService', CharacterService, [
      'characterRepository',
    ])
    .registerClass('lorebookService', LorebookService, ['lorebookRepository'])
}

export type RootContainer = ReturnType<typeof buildRootContainer>
export type AppEnv = InferdiHonoEnv<RootContainer> & {
  Variables: InferdiHonoEnv<RootContainer>['Variables'] & HonoLogLayerVariables
}
