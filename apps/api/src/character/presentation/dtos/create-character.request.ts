import { createZodDto } from 'nestjs-zod'
import z from 'zod'
import { characterRevisionInputSchema } from './character-revision.schema'

const createCharacterSchema = z.object({
  alias: z.string().trim().min(1).nullable().default(null),
  revision: characterRevisionInputSchema,
})

export class CreateCharacterRequest extends createZodDto(
  createCharacterSchema,
) {}
