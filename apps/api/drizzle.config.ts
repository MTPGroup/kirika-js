import { defineConfig } from 'drizzle-kit'

export default defineConfig({
  schema: './src/db/index.ts',
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: {
    url:
      process.env.DATABASE_URL ??
      'postgres://kirika:kirika_dev@localhost:5432/kirika',
  },
})
