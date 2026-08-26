import { z } from 'zod'

export const configurationSchema = z.object({
  app: z.object({
    name: z.string().min(1).default('Kirika'),
    port: z.number().int().positive().default(3000),
    corsOrigins: z.array(z.url()).min(1).default(['http://localhost:3000']),
  }),

  database: z.object({
    url: z.url(),
    poolMax: z.number().int().positive().default(10),
  }),
  model: z.object({
    baseUrl: z.url(),
    apiKey: z.string().min(1),
    defaultModel: z.string().min(1),
  }),

  storage: z.object({
    provider: z.enum(['filesystem', 's3']).default('filesystem'),
    rootDir: z.string().min(1).default('./data/assets'),
    bucket: z.string().optional(),
    region: z.string().optional(),
    endpoint: z.string().optional(),
    accessKeyId: z.string().optional(),
    secretAccessKey: z.string().optional(),
    forcePathStyle: z.boolean().optional(),
  }),
  auth: z.object({
    baseUrl: z.url(),
    secret: z.string().min(32),
    trustedOrigins: z.array(z.string()).min(1),
  }),
})

export type Configuration = z.infer<typeof configurationSchema>
