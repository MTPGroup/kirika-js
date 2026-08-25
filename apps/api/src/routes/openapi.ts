import type { DescribeRouteOptions } from 'hono-openapi'
import { z } from 'zod'

type RequestBody = NonNullable<DescribeRouteOptions['requestBody']>
type InlineRequestBody = Exclude<RequestBody, { $ref: string }>
type OpenAPISchema = NonNullable<InlineRequestBody['content'][string]['schema']>

export const idParamSchema = z.object({
  id: z.uuid(),
})

export const sessionSecurity = [{ sessionCookie: [] }]

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
