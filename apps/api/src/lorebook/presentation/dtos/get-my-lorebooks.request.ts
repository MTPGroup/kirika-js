import { createZodDto } from 'nestjs-zod'
import z from 'zod'

const getMyLorebooksSchema = z.object({
	page: z.number().positive(),
	pageSize: z.number().min(1).max(100),
})

export class GetMyLorebooksParams extends createZodDto(getMyLorebooksSchema) {}
