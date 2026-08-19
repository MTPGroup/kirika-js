import { Inject, Injectable, type OnApplicationShutdown } from '@nestjs/common'
import { drizzle } from 'drizzle-orm/node-postgres'
import { Pool } from 'pg'
import { DRIZZLE_OPTIONS } from './drizzle.constant'
import { authRelations, lorebookRelations } from './drizzle.drizzle-schema'
import type { DatabaseOptions } from './drizzle.types'

function createDatabase(pool: Pool) {
	return drizzle({
		client: pool,
		relations: {
			...authRelations,
			...lorebookRelations,
		},
	})
}

export type Database = ReturnType<typeof createDatabase>

@Injectable()
export class DrizzleService implements OnApplicationShutdown {
	private readonly pool: Pool

	readonly db: Database

	constructor(@Inject(DRIZZLE_OPTIONS) options: DatabaseOptions) {
		this.pool = new Pool({
			connectionString: options.url,
			max: options.poolMax,
		})

		this.db = createDatabase(this.pool)
	}

	async onApplicationShutdown() {
		await this.pool.end()
	}
}
