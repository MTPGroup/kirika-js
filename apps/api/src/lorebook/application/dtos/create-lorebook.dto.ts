import { createZodDto } from 'nestjs-zod'
import { z } from 'zod'

export const createLorebookSchema = z.object({
	name: z.string().min(1),
	description: z.string().default(''),
})

export class CreateLorebookDto extends createZodDto(createLorebookSchema) {}
