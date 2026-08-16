import 'dotenv/config'
import { drizzle } from 'drizzle-orm/node-postgres'
import { Pool } from 'pg'
import { parseAuthConfig } from './src/auth/auth.config'
import { createAuth } from './src/auth/auth.factory'
import { parseDatabaseConfig } from './src/core/database/database.config'
import { authRelations } from './src/core/database/schema'

const databaseConfig = parseDatabaseConfig(process.env)
const authConfig = parseAuthConfig(process.env)

const pool = new Pool({
	connectionString: databaseConfig.url,
	max: databaseConfig.poolMax,
})

const database = drizzle({
	client: pool,
	relations: {
		...authRelations,
	},
})

const cliMailer = {
	async sendVerificationOtp() {},
}

export const auth = createAuth(database, authConfig, cliMailer)
