import 'dotenv/config'
import { defineConfig } from 'drizzle-kit'
import { loadConfiguration } from './src/shared/infrastructure/config/config.loader'

const configuration = loadConfiguration()

export default defineConfig({
  out: './drizzle',
  schema: [
    './src/auth/auth.drizzle-schema.ts',
    './src/*/infrastructure/persistence/*.drizzle-schema.ts',
  ],
  dialect: 'postgresql',
  dbCredentials: {
    url: configuration.database.url,
  },
})
