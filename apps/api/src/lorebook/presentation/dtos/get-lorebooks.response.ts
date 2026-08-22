import { createZodDto } from 'nestjs-zod'
import z from 'zod'
import type { LorebookPageResult } from '~/lorebook/application/queries/get-my-lorebooks.query'
import { apiPaginationResponseSchema } from '~/shared/presentation/api-response.interface'

const lorebookListItemSchema = z.object({
  id: z.uuid(),
  ownerId: z.string().min(1),
  name: z.string(),
  description: z.string(),
  visibility: z.enum(['private', 'unlisted', 'public']),
  currentRevisionId: z.uuid().nullable(),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
})

const getLorebooksResponseSchema = apiPaginationResponseSchema(
  lorebookListItemSchema,
)

export class GetLorebooksResponse extends createZodDto(
  getLorebooksResponseSchema,
) {
  static fromResult(result: LorebookPageResult): GetLorebooksResponse {
    return {
      code: 200,
      message: 'success',
      data: {
        items: result.items.map((item) => ({
          ...item,
          createdAt: item.createdAt.toISOString(),
          updatedAt: item.updatedAt.toISOString(),
        })),
        pagination: {
          ...result.pagination,
          hasNextPage: result.pagination.totalPages > result.pagination.page,
          hasPreviousPage: result.pagination.page > 1,
        },
      },
      timestamp: Date.now(),
    }
  }
}
