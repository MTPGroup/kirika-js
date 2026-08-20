import z from 'zod'

export const apiResponseSchema = <T extends z.ZodType>(dataSchema: T) =>
	z.object({
		code: z.number().int().default(200),
		message: z.string(),
		data: dataSchema,
		timestamp: z.number().int().default(Date.now()),
	})

export type ApiResponse<T extends z.ZodType> = z.infer<
	ReturnType<typeof apiResponseSchema<T>>
>

export const paginationMetaSchema = z.object({
	page: z.number().int().min(1),
	pageSize: z.number().int().min(1),
	total: z.number().int().min(0),
	totalPages: z.number().int().min(0),
	hasPreviousPage: z.boolean(),
	hasNextPage: z.boolean(),
})

export type PaginationMeta = z.infer<typeof paginationMetaSchema>

export const paginationDataSchema = <T extends z.ZodType>(itemSchema: T) =>
	z.object({
		items: z.array(itemSchema),
		pagination: paginationMetaSchema,
	})

export const apiPaginationResponseSchema = <T extends z.ZodType>(
	itemSchema: T,
) => apiResponseSchema(paginationDataSchema(itemSchema))

export type ApiPaginationResponse<T extends z.ZodType> = z.infer<
	ReturnType<typeof apiPaginationResponseSchema<T>>
>
