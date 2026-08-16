import 'dotenv/config'
import { defineConfig } from 'drizzle-kit'
import { loadConfiguration } from './src/core/config/config.loader'

const configuration = loadConfiguration()

export default defineConfig({
	out: './drizzle',
	schema: './src/core/drizzle/drizzle.drizzle-schema.ts',
	dialect: 'postgresql',
	dbCredentials: {
		url: configuration.database.url,
	},
})
