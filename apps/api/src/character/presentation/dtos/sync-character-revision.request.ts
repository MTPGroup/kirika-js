import { createZodDto } from 'nestjs-zod'
import { characterRevisionInputSchema } from './character-revision.schema'

export class SyncCharacterRevisionRequest extends createZodDto(
  characterRevisionInputSchema,
) {}
