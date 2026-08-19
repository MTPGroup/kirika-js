import { createZodDto } from 'nestjs-zod'
import z from 'zod'
import { Lorebook } from '~/lorebook/domain/entities/lorebook.entity'
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
	static fromDomain(domain: Lorebook): CreateLorebookResponse {
		const data = {
			id: domain.id.value,
			ownerId: domain.ownerId.value,
			name: domain.name,
			description: domain.description,
			currentRevisionId: domain.activeRevision?.id.value ?? null,
			createdAt: domain.createdAt.toISOString(),
			updatedAt: domain.updatedAt.toISOString(),
		}

		return {
			code: 201,
			message: 'success',
			data,
			timestamp: Date.now(),
		}
	}
}
