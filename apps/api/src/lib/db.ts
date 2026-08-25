import { drizzle } from 'drizzle-orm/node-postgres'
import { Pool } from 'pg'
import { relations } from '../db/index.js'

export function createDb(url: string, max: number) {
  const pool = new Pool({ connectionString: url, max })
  return drizzle({ client: pool, relations })
}

export type Db = ReturnType<typeof createDb>
