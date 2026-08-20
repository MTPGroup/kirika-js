import { createZodDto } from 'nestjs-zod'
import z from 'zod'
import { CreateLorebookResult } from '~/lorebook/application/commands/create-lorebook.command'
import { apiResponseSchema } from '~/shared/presentation/api-response.interface'

const _createLorebookResponseSchema = z.object({
	id: z.uuid(),
	ownerId: z.uuid(),
	name: z.string(),
	description: z.string(),
	currentRevisionId: z.uuid().nullable(),
	createdAt: z.iso.datetime(),
	updatedAt: z.iso.datetime(),
})

const createLorebookResponseSchema = apiResponseSchema(
	_createLorebookResponseSchema,
)

export class CreateLorebookResponse extends createZodDto(
	createLorebookResponseSchema,
) {
	static fromResult(result: CreateLorebookResult): CreateLorebookResponse {
		return {
			code: 201,
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
