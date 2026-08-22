import { createZodDto } from 'nestjs-zod'
import { z } from 'zod'

const createLorebookSchema = z.object({
  name: z.string().min(1),
  description: z.string().default(''),
})

export class CreateLorebookRequest extends createZodDto(createLorebookSchema) {}
