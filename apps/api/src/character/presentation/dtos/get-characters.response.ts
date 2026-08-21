import { createZodDto } from 'nestjs-zod'
import z from 'zod'
import { apiPaginationResponseSchema } from '~/shared/presentation/api-response.interface'
import type { CharacterPageResult } from '../../application/queries/get-my-characters.query'

const characterListItemSchema = z.object({
	id: z.uuid(),
	ownerId: z.uuid(),
	alias: z.string().nullable(),
	currentRevisionId: z.uuid().nullable(),
	draftRevisionId: z.uuid().nullable(),
	name: z.string(),
	description: z.string(),
	createdAt: z.iso.datetime(),
	updatedAt: z.iso.datetime(),
})

const getCharactersResponseSchema = apiPaginationResponseSchema(
	characterListItemSchema,
)

export class GetCharactersResponse extends createZodDto(
	getCharactersResponseSchema,
) {
	static fromResult(result: CharacterPageResult): GetCharactersResponse {
		return {
			code: 200,
			message: 'success',
			data: {
				items: result.items.map((item) => ({
					...item,
					createdAt: item.createdAt.toISOString(),
					updatedAt: item.updatedAt.toISOString(),
				})),
				pagination: {
					...result.pagination,
					hasPreviousPage: result.pagination.page > 1,
					hasNextPage: result.pagination.page < result.pagination.totalPages,
				},
			},
			timestamp: Date.now(),
		}
	}
}
