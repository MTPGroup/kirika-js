import { serve } from '@hono/node-server'
import { createApp } from './app.js'
import { loadConfiguration } from './config/loader.js'

const app = createApp()
const config = loadConfiguration()

serve({ fetch: app.fetch, port: config.app.port }, (info) => {
  console.log(`Kirika API running at http://localhost:${info.port}`)
})
