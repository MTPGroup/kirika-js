import { z } from 'zod'
import { recordDefault, stringArrayDefault, stringDefault } from './helpers'

export const CharacterBookEntrySchema = z.object({
	keys: stringArrayDefault(),
	content: stringDefault(),
	extensions: recordDefault(),
	enabled: z.coerce.boolean().default(true),
	insertion_order: z.coerce.number().default(0),
	case_sensitive: z.coerce.boolean().optional(),

	name: stringDefault().optional(),
	priority: z.coerce.number().optional(),

	id: z.coerce.number().optional(),
	comment: stringDefault().optional(),
	selective: z.coerce.boolean().optional(),
	secondary_keys: stringArrayDefault().optional(),
	constant: z.coerce.boolean().optional(),
	position: z.enum(['before_char', 'after_char']).optional(),
})

export const CharacterBookSchema = z.object({
	name: stringDefault().optional(),
	description: stringDefault().optional(),
	scan_depth: z.coerce.number().optional(),
	token_budget: z.coerce.number().optional(),
	recursive_scanning: z.coerce.boolean().optional(),
	extensions: recordDefault(),
	entries: z
		.array(CharacterBookEntrySchema)
		.nullish()
		.catch([])
		.transform((val) => val ?? []),
})

export type CharacterBookEntry = z.infer<typeof CharacterBookEntrySchema>
export type CharacterBook = z.infer<typeof CharacterBookSchema>
