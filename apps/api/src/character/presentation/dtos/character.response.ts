import { createZodDto } from 'nestjs-zod'
import z from 'zod'
import { apiResponseSchema } from '~/shared/presentation/api-response.interface'
import type { CharacterResult } from '../../application/character.result'
import { characterRevisionResultSchema } from './character-revision.schema'

const characterResponseSchema = apiResponseSchema(
  z.object({
    id: z.uuid(),
    ownerId: z.uuid(),
    alias: z.string().nullable(),
    currentRevisionId: z.uuid().nullable(),
    draftRevisionId: z.uuid().nullable(),
    revisions: z.array(characterRevisionResultSchema),
    createdAt: z.iso.datetime(),
    updatedAt: z.iso.datetime(),
  }),
)

export class CharacterResponse extends createZodDto(characterResponseSchema) {
  static fromResult(
    result: CharacterResult,
    code: 200 | 201 = 200,
  ): CharacterResponse {
    return {
      code,
      message: 'success',
      data: {
        ...result,
        revisions: result.revisions.map((revision) => ({
          ...revision,
          createdAt: revision.createdAt.toISOString(),
          updatedAt: revision.updatedAt.toISOString(),
        })),
        createdAt: result.createdAt.toISOString(),
        updatedAt: result.updatedAt.toISOString(),
      },
      timestamp: Date.now(),
    }
  }
}
