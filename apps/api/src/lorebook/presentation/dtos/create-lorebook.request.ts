import { createZodDto } from 'nestjs-zod'
import { z } from 'zod'
import { CreateLorebookCommand } from '~/lorebook/application/dtos/create-lorebook.dto'

const createLorebookSchema = z.object({
	name: z.string().min(1),
	description: z.string().default(''),
})

export class CreateLorebookRequest extends createZodDto(createLorebookSchema) {
	toCommand(): CreateLorebookCommand {
		return {
			name: this.name,
			description: this.description,
		}
	}
}
