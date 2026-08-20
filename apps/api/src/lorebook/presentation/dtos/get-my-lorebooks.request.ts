import { createZodDto } from 'nestjs-zod'
import z from 'zod'

const getMyLorebooksSchema = z.object({
	page: z.coerce.number().int().min(1).default(1),
	pageSize: z.coerce.number().int().min(1).max(100).default(20),
})

export class GetMyLorebooksParams extends createZodDto(getMyLorebooksSchema) {}
