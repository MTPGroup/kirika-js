import { type DescribeRouteOptions, resolver } from 'hono-openapi'
import { z } from 'zod'

type RequestBody = NonNullable<DescribeRouteOptions['requestBody']>
type InlineRequestBody = Exclude<RequestBody, { $ref: string }>
type OpenAPISchema = NonNullable<InlineRequestBody['content'][string]['schema']>

export const idParamSchema = z.object({
  id: z.uuid(),
})

export const sessionSecurity = [{ sessionCookie: [] }]

export const listQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(20),
  offset: z.coerce.number().int().min(0).default(0),
})

export function jsonRequest(schema: z.ZodType): RequestBody {
  const jsonSchema = z.toJSONSchema(schema) as unknown as OpenAPISchema
  return {
    required: true,
    content: {
      'application/json': {
        schema: jsonSchema,
      },
    },
  }
}

export function jsonResponse(schema: z.ZodType, description: string) {
  return {
    description,
    content: {
      'application/json': {
        schema: resolver(schema),
      },
    },
  }
}

export function paginatedListSchema(itemSchema: z.ZodType) {
  return z.object({
    items: z.array(itemSchema),
    total: z.number(),
    hasMore: z.boolean(),
  })
}
