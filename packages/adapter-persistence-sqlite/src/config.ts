import path from 'node:path'
import { z } from 'zod'
import { loadConfig } from 'zod-config'
import { tomlAdapter } from 'zod-config/toml-adapter'

const configSchema = z.object({
  sqlite: z.object({
    url: z.string().min(1),
  }),
})

const filePath = path.join(process.cwd(), 'config.toml')

export const config = await loadConfig({
  schema: configSchema,
  adapters: tomlAdapter({ path: filePath }),
})
