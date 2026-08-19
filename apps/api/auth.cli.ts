import 'dotenv/config'
import { drizzle } from 'drizzle-orm/node-postgres'
import { Pool } from 'pg'
import { createAuth } from './src/auth/auth.factory'
import { loadConfiguration } from './src/shared/infrastructure/config/config.loader'

const config = loadConfiguration()

const pool = new Pool({
	connectionString: config.database.url,
	max: config.database.poolMax,
})

const database = drizzle({
	client: pool,
})

const cliMailer = {
	async sendVerificationOtp() {},
}

export const auth = createAuth(database, config.auth, cliMailer)
