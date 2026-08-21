import { createZodDto } from 'nestjs-zod'
import z from 'zod'

const updateCharacterSchema = z.object({
	alias: z.string().trim().min(1).nullable(),
})

export class UpdateCharacterRequest extends createZodDto(
	updateCharacterSchema,
) {}
