import 'dotenv/config'
import { drizzle } from 'drizzle-orm/node-postgres'
import { Pool } from 'pg'
import { createAuth } from './src/auth/auth.factory.js'
import { loadConfiguration } from './src/core/config/config.loader.js'
import { authRelations } from './src/core/database/schema/index.js'

const config = loadConfiguration()

const pool = new Pool({
	connectionString: config.database.url,
	max: config.database.poolMax,
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

export const auth = createAuth(database, config.auth, cliMailer)
