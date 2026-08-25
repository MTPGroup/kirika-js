import { resolve } from 'node:path'
import { loadConfigSync } from 'zod-config'
import { tomlAdapter } from 'zod-config/toml-adapter'
import { type Configuration, configurationSchema } from './schema'

let cachedConfiguration: Configuration | undefined

export function loadConfiguration(): Configuration {
  if (cachedConfiguration) {
    return cachedConfiguration
  }

  const configDirectory = resolve(process.cwd(), 'config')
  const deployment = process.env.NODE_ENV ?? 'development'

  cachedConfiguration = loadConfigSync({
    schema: configurationSchema,
    adapters: [
      tomlAdapter({
        path: resolve(configDirectory, 'default.toml'),
      }),
      tomlAdapter({
        path: resolve(configDirectory, `${deployment}.toml`),
        silent: true,
      }),
      tomlAdapter({
        path: resolve(configDirectory, 'local.toml'),
        silent: true,
      }),
      tomlAdapter({
        path: resolve(configDirectory, `local-${deployment}.toml`),
        silent: true,
      }),
    ],
  })

  return cachedConfiguration
}
