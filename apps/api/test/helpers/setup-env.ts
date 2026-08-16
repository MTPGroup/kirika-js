import { inject } from 'vitest'

process.env.NODE_ENV = 'test'
process.env.DATABASE_URL = inject('databaseUrl')
