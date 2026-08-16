import { Inject, Injectable, type OnApplicationShutdown } from '@nestjs/common'
import { drizzle, type NodePgDatabase } from 'drizzle-orm/node-postgres'
import { Pool } from 'pg'
import { DRIZZLE_OPTIONS } from './drizzle.constant'
import { authRelations } from './drizzle.drizzle-schema'
import type { DatabaseOptions } from './drizzle.types'

@Injectable()
export class DrizzleService implements OnApplicationShutdown {
	private readonly pool: Pool

	readonly db: NodePgDatabase

	constructor(@Inject(DRIZZLE_OPTIONS) options: DatabaseOptions) {
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
