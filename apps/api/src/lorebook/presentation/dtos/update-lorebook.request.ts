import { createZodDto } from 'nestjs-zod'
import z from 'zod'

const updateLorebookSchema = z
	.object({
		name: z.string().trim().min(1).optional(),
		description: z.string().optional(),
		visibility: z.enum(['private', 'unlisted', 'public']).optional(),
	})
	.refine(
		({ name, description, visibility }) =>
			name !== undefined ||
			description !== undefined ||
			visibility !== undefined,
		{
			message: '至少需要提供一个待更新字段',
		},
	)

export class UpdateLorebookRequest extends createZodDto(updateLorebookSchema) {}
