import { createZodDto } from 'nestjs-zod'
import z from 'zod'
import type { UpdateLorebookResult } from '~/lorebook/application/commands/update-lorebook.command'
import { apiResponseSchema } from '~/shared/presentation/api-response.interface'

const updateLorebookResponseSchema = apiResponseSchema(
	z.object({
		id: z.uuid(),
		ownerId: z.uuid(),
		name: z.string(),
		description: z.string(),
		visibility: z.enum(['private', 'unlisted', 'public']),
		currentRevisionId: z.uuid().nullable(),
		createdAt: z.iso.datetime(),
		updatedAt: z.iso.datetime(),
	}),
)

export class UpdateLorebookResponse extends createZodDto(
	updateLorebookResponseSchema,
) {
	static fromResult(result: UpdateLorebookResult): UpdateLorebookResponse {
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
