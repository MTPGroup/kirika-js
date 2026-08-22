import { createZodDto } from 'nestjs-zod'
import z from 'zod'
import type { LorebookRevisionResult } from '~/lorebook/application/lorebook-revision.result'
import { apiResponseSchema } from '~/shared/presentation/api-response.interface'

const lorebookRevisionResponseSchema = apiResponseSchema(
  z.object({
    lorebookId: z.uuid(),
    id: z.uuid(),
    revisionNumber: z.number().int().min(1),
    isDraft: z.boolean(),
    entries: z.array(
      z.object({
        id: z.uuid(),
        keys: z.array(z.string()),
        title: z.string(),
        enabled: z.boolean(),
        content: z.string(),
        position: z.enum(['before_history', 'after_history']),
        priority: z.number().int(),
      }),
    ),
    currentRevisionId: z.uuid().nullable(),
    updatedAt: z.iso.datetime(),
  }),
)

export class LorebookRevisionResponse extends createZodDto(
  lorebookRevisionResponseSchema,
) {
  static fromResult(
    result: LorebookRevisionResult,
    code: 200 | 201 = 200,
  ): LorebookRevisionResponse {
    return {
      code,
      message: 'success',
      data: {
        ...result,
        updatedAt: result.updatedAt.toISOString(),
      },
      timestamp: Date.now(),
    }
  }
}
