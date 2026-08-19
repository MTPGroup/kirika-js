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
