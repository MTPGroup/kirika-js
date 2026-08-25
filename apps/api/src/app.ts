import { OpenAICompatibleChatModel } from '@kirika-js/adapter-model-openai-compatible'
import { Hono } from 'hono'
import { PgCharacterRepository } from './character/character.repository.js'
import { CharacterService } from './character/character.service.js'
import { PgCharacterContextResolver } from './character/context-resolver.js'
import { ChatService } from './chat/chat.service.js'
import { loadConfiguration } from './config/loader.js'
import { PgConversationRepository } from './conversation/conversation.repository.js'
import { PgConversationMessageRepository } from './conversation/conversation-message.repository.js'
import { createAuth } from './lib/auth.js'
import { createDb } from './lib/db.js'
import { PgLorebookRepository } from './lorebook/lorebook.repository.js'
import { LorebookService } from './lorebook/lorebook.service.js'
import { mountAuth } from './routes/auth.js'
import { mountCharacterRoutes } from './routes/characters.js'
import { mountChatRoutes } from './routes/chat.js'
import { mountLorebookRoutes } from './routes/lorebooks.js'

export function createApp() {
  const config = loadConfiguration()
  const db = createDb(config.database.url, config.database.poolMax)
  const auth = createAuth(db, config.auth)

  const model = new OpenAICompatibleChatModel({
    baseUrl: config.model.baseUrl,
    apiKey: config.model.apiKey,
  })

  const conversationRepository = new PgConversationRepository(db)
  const messageRepository = new PgConversationMessageRepository(db)
  const characterRepository = new PgCharacterRepository(db)
  const lorebookRepository = new PgLorebookRepository(db)
  const characterContextResolver = new PgCharacterContextResolver(db)

  const chatService = new ChatService({
    model,
    characterContextResolver,
    conversationRepository,
    messageRepository,
    defaultModel: config.model.defaultModel,
  })
  const characterService = new CharacterService(characterRepository)
  const lorebookService = new LorebookService(lorebookRepository)

  const app = new Hono()

  app.get('/health', (c) => c.json({ ok: true }))

  mountAuth(app, auth)
  mountChatRoutes(app, {
    auth,
    db,
    chatService,
    conversationRepository,
    messageRepository,
  })
  mountCharacterRoutes(app, {
    auth,
    service: characterService,
    repository: characterRepository,
  })
  mountLorebookRoutes(app, { auth, service: lorebookService })

  return app
}
