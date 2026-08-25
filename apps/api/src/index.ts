import { serve } from '@hono/node-server'
import { createApp } from './app'
import { loadConfiguration } from './config/loader'
import { log } from './lib/logger'

const app = createApp()
const config = loadConfiguration()

serve({ fetch: app.fetch, port: config.app.port }, (info) => {
  log.info(`Kirika API running at http://localhost:${info.port}`)
})
