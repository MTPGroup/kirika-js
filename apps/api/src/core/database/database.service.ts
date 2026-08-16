import { Inject, Injectable, type OnApplicationShutdown } from '@nestjs/common'
import { drizzle, type NodePgDatabase } from 'drizzle-orm/node-postgres'
import { Pool } from 'pg'
import { DATABASE_OPTIONS, type DatabaseOptions } from './database.types'
import { authRelations } from './schema'

@Injectable()
export class DatabaseService implements OnApplicationShutdown {
	private readonly pool: Pool

	readonly db: NodePgDatabase

	constructor(@Inject(DATABASE_OPTIONS) options: DatabaseOptions) {
		this.pool = new Pool({
			connectionString: options.url,
			max: options.poolMax,
		})

		this.db = drizzle({
			client: this.pool,
			relations: {
				...authRelations,
			},
		})
	}

	async onApplicationShutdown() {
		await this.pool.end()
	}
}
