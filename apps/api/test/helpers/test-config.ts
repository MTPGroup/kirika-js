import {
  type Configuration,
  configurationSchema,
} from '~/shared/infrastructure/config/config.schema'

export function createTestConfiguration(databaseUrl: string): Configuration {
  return configurationSchema.parse({
    app: {
      name: 'Kirika Test',
      port: 3000,
    },
    database: {
      url: databaseUrl,
      poolMax: 1,
    },
    auth: {
      baseUrl: 'http://localhost:3000',
      secret: 'test-secret-that-is-at-least-32-characters-long',
      trustedOrigins: ['http://localhost:3000'],
    },
    mailer: {
      host: 'localhost',
      port: 1025,
      secure: false,
      user: 'test',
      password: 'test',
      from: 'Kirika <no-reply@kirika.test>',
    },
  })
}
