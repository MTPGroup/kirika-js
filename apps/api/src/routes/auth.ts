import type { Hono } from 'hono'
import type { Auth } from '../lib/auth.js'

export function mountAuth(app: Hono, auth: Auth): void {
  app.on(['GET', 'POST'], '/api/auth/**', (c) => auth.handler(c.req.raw))
}
