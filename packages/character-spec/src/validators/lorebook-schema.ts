import { z } from 'zod'
import { ExtensionsSchema } from './helpers'

const finiteNumber = z.number().finite()

export const CharacterBookEntrySchema = z.strictObject({
	keys: z.array(z.string()),
	content: z.string(),
	extensions: ExtensionsSchema,
	enabled: z.boolean(),
	insertion_order: finiteNumber,
	case_sensitive: z.boolean().optional(),

	name: z.string().optional(),
	priority: finiteNumber.optional(),

	id: finiteNumber.optional(),
	comment: z.string().optional(),
	selective: z.boolean().optional(),
	secondary_keys: z.array(z.string()).optional(),
	constant: z.boolean().optional(),
	position: z.enum(['before_char', 'after_char']).optional(),
})

export const CharacterBookSchema = z.strictObject({
	name: z.string().optional(),
	description: z.string().optional(),
	scan_depth: finiteNumber.optional(),
	token_budget: finiteNumber.optional(),
	recursive_scanning: z.boolean().optional(),
	extensions: ExtensionsSchema,
	entries: z.array(CharacterBookEntrySchema),
})

export type CharacterBookEntry = z.infer<typeof CharacterBookEntrySchema>
export type CharacterBook = z.infer<typeof CharacterBookSchema>
