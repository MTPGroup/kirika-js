import type { Hono } from 'hono'
import type { Auth } from '../lib/auth'
import type { AppEnv } from '../lib/logger'

export function mountAuth(app: Hono<AppEnv>, auth: Auth): void {
  app.all('/**', (c) => auth.handler(c.req.raw))
}
