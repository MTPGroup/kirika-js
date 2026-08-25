import type { Hono } from 'hono'
import type { AppEnv } from '../container'

export function mountAuth(app: Hono<AppEnv>): void {
  app.all('/**', (c) => c.var.di.get('auth').handler(c.req.raw))
}
