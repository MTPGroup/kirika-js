import { Inject, Injectable, type OnApplicationShutdown } from '@nestjs/common'
import type { ConfigType } from '@nestjs/config'
import { drizzle, type NodePgDatabase } from 'drizzle-orm/node-postgres'
import { Pool } from 'pg'
import { databaseConfig } from './database.config'
import * as schema from './schema'

export type Database = NodePgDatabase<typeof schema>

@Injectable()
export class DatabaseService implements OnApplicationShutdown {
	private readonly pool: Pool

	readonly db: Database

	constructor(
		@Inject(databaseConfig.KEY)
		config: ConfigType<typeof databaseConfig>,
	) {
		this.pool = new Pool({
			connectionString: config.url,
			max: config.poolMax,
		})

		this.db = drizzle({
			client: this.pool,
		})
	}

	async onApplicationShutdown() {
		await this.pool.end()
	}
}
