import { OpenAICompatibleChatModel } from '@kirika-js/adapter-model-openai-compatible'
import { honoLogLayer } from '@loglayer/hono'
import { Hono } from 'hono'
import { describeRoute } from 'hono-openapi'
import {
  ProblemDetailsError,
  problemDetails,
  problemDetailsHandler,
} from 'hono-problem-details'
import { rateLimiter } from 'hono-rate-limiter'
import { PgCharacterRepository } from './character/character.repository'
import { CharacterService } from './character/character.service'
import { PgCharacterContextResolver } from './character/context-resolver'
import { ChatService } from './chat/chat.service'
import { loadConfiguration } from './config/loader'
import { PgConversationRepository } from './conversation/conversation.repository'
import { PgConversationMessageRepository } from './conversation/conversation-message.repository'
import { createAuth } from './lib/auth'
import { createDb } from './lib/db'
import { type AppEnv, log } from './lib/logger'
import { PgLorebookRepository } from './lorebook/lorebook.repository'
import { LorebookService } from './lorebook/lorebook.service'
import { mountAuth } from './routes/auth'
import { mountCharacterRoutes } from './routes/characters'
import { mountChatRoutes } from './routes/chat'
import { mountApiDocumentation } from './routes/docs'
import { mountLorebookRoutes } from './routes/lorebooks'
import { problems } from './routes/problems'

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

  const app = new Hono<AppEnv>()
  const api = new Hono<AppEnv>()
  const authRoutes = new Hono<AppEnv>()

  app.use(
    honoLogLayer({
      instance: log,
      autoLogging: {
        ignore: ['/health', '/docs', '/openapi.json'],
      },
    }),
  )

  const problemHandler = problemDetailsHandler({
    includeStack: process.env.NODE_ENV !== 'production',
    autoInstance: true,
  })
  app.onError((err, c) => {
    const status =
      err instanceof ProblemDetailsError ? err.problemDetails.status : 500
    const logger = c.var.logger
      .withError(err)
      .withMetadata({ statusCode: status })
    if (status >= 500) {
      logger.error('Request error')
    } else {
      logger.warn('Request rejected')
    }
    return problemHandler(err, c)
  })

  app.notFound((c) => {
    throw problems.create('NOT_FOUND', {
      detail: '接口不存在',
      instance: c.req.path,
    })
  })

  api.use(
    '/conversations/:id/messages',
    rateLimiter({
      windowMs: 60_000,
      limit: 10,
      keyGenerator: (c) =>
        c.req.header('authorization')?.replace(/^Bearer\s+/i, '') ??
        c.req
          .header('cookie')
          ?.match(/better-auth\.session_token=([^;]+)/)?.[1] ??
        c.req.header('x-forwarded-for')?.split(',')[0]?.trim() ??
        'anonymous',
      handler: () => {
        throw problemDetails({
          status: 429,
          title: 'Too Many Requests',
          type: 'https://api.kirika.cn/problems/rate-limited',
          detail: '请求过于频繁，请稍后再试。',
          extensions: { retryAfter: 60 },
        })
      },
    }),
  )

  app.get(
    '/health',
    describeRoute({
      tags: ['System'],
      summary: '服务健康检查',
      responses: {
        200: { description: '服务正常。' },
      },
    }),
    (c) => c.json({ ok: true }),
  )

  mountAuth(authRoutes, auth)
  api.route('/auth', authRoutes)
  mountChatRoutes(api, {
    auth,
    db,
    chatService,
    conversationRepository,
    messageRepository,
  })
  mountCharacterRoutes(api, {
    auth,
    service: characterService,
  })
  mountLorebookRoutes(api, { auth, service: lorebookService })

  app.route('/api', api)
  mountApiDocumentation(app)

  return app
}
