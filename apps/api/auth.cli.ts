import 'dotenv/config'
import { drizzle } from 'drizzle-orm/node-postgres'
import { Pool } from 'pg'
import { parseDatabaseConfig } from './src/database/database.config'
import { authRelations } from './src/database/schema'
import { parseAuthConfig } from './src/modules/auth/auth.config'
import { createAuth } from './src/modules/auth/auth.factory'

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

export const auth = createAuth(database, authConfig)
