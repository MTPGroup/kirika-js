import { drizzleAdapter } from '@better-auth/drizzle-adapter'
import { betterAuth } from 'better-auth'
import { openAPI } from 'better-auth/plugins'
import { schema } from '../db/index'
import type { Db } from './db'

export interface AuthConfig {
  readonly baseUrl: string
  readonly secret: string
  readonly trustedOrigins: readonly string[]
}

export function createAuth(db: Db, config: AuthConfig) {
  return betterAuth({
    baseURL: config.baseUrl,
    secret: config.secret,
    trustedOrigins: [...config.trustedOrigins],
    database: drizzleAdapter(db, {
      provider: 'pg',
      schema,
      usePlural: true,
    }),
    emailAndPassword: {
      enabled: true,
      requireEmailVerification: false,
    },
    advanced: {
      database: {
        generateId: 'uuid',
      },
    },
    plugins: [openAPI({ disableDefaultReference: true })],
  })
}

export type Auth = ReturnType<typeof createAuth>
