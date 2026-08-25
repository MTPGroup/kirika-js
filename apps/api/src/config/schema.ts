import { z } from 'zod'

export const configurationSchema = z.object({
  app: z.object({
    name: z.string().min(1).default('Kirika'),
    port: z.number().int().positive().default(3000),
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

  auth: z.object({
    baseUrl: z.url(),
    secret: z.string().min(32),
    trustedOrigins: z.array(z.string()).min(1),
  }),
})

export type Configuration = z.infer<typeof configurationSchema>
