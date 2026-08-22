import { createZodDto } from 'nestjs-zod'
import z from 'zod'
import type { GetLorebookResult } from '~/lorebook/application/queries/get-lorebook.query'
import { apiResponseSchema } from '~/shared/presentation/api-response.interface'

const lorebookEntrySchema = z.object({
  id: z.uuid(),
  keys: z.array(z.string()),
  title: z.string(),
  enabled: z.boolean(),
  content: z.string(),
  position: z.enum(['before_history', 'after_history']),
  priority: z.number().int(),
})

const lorebookRevisionSchema = z.object({
  id: z.uuid(),
  revisionNumber: z.number().int().min(1),
  isDraft: z.boolean(),
  entries: z.array(lorebookEntrySchema),
})

const getLorebookResponseSchema = apiResponseSchema(
  z.object({
    id: z.uuid(),
    ownerId: z.uuid(),
    name: z.string(),
    description: z.string(),
    visibility: z.enum(['private', 'unlisted', 'public']),
    currentRevisionId: z.uuid().nullable(),
    draftRevisionId: z.uuid().nullable(),
    revisions: z.array(lorebookRevisionSchema),
    createdAt: z.iso.datetime(),
    updatedAt: z.iso.datetime(),
  }),
)

export class GetLorebookResponse extends createZodDto(
  getLorebookResponseSchema,
) {
  static fromResult(result: GetLorebookResult): GetLorebookResponse {
    return {
      code: 200,
      message: 'success',
      data: {
        ...result,
        createdAt: result.createdAt.toISOString(),
        updatedAt: result.updatedAt.toISOString(),
      },
      timestamp: Date.now(),
    }
  }
}
