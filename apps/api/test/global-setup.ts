import { resolve } from 'node:path'
import {
	PostgreSqlContainer,
	type StartedPostgreSqlContainer,
} from '@testcontainers/postgresql'
import { drizzle } from 'drizzle-orm/node-postgres'
import { migrate } from 'drizzle-orm/node-postgres/migrator'
import { Pool } from 'pg'
import type { TestProject } from 'vitest/node'

let container: StartedPostgreSqlContainer | undefined

export async function setup(project: TestProject) {
	container = await new PostgreSqlContainer('postgres:18.4-alpine')
		.withDatabase('kirika_test')
		.withUsername('kirika')
		.withPassword('kirika_test')
		.start()

	const databaseUrl = container.getConnectionUri()
	const pool = new Pool({
		connectionString: databaseUrl,
	})

	try {
		const database = drizzle({
			client: pool,
		})

		await migrate(database, {
			migrationsFolder: resolve('drizzle'),
		})
	} finally {
		await pool.end()
	}

	project.provide('databaseUrl', databaseUrl)
}

export async function teardown() {
	await container?.stop()
}
