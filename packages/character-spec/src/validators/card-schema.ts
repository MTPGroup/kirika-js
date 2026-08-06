import { z } from 'zod'
import { recordDefault, stringArrayDefault, stringDefault } from './helpers'
import { CharacterBookSchema } from './lorebook-schema'

export const CharacterCardV2DataSchema = z.object({
	name: z
		.string()
		.min(1, '角色名字不能为空')
		.nullish()
		.catch('Unnamed')
		.transform((val) => val ?? 'Unnamed'),
	description: stringDefault(),
	personality: stringDefault(),
	scenario: stringDefault(),
	first_mes: stringDefault(),
	mes_example: stringDefault(),

	creator_notes: stringDefault(),
	system_prompt: stringDefault(),
	post_history_instructions: stringDefault(),
	alternate_greetings: stringArrayDefault(),
	character_book: CharacterBookSchema.optional(),

	tags: stringArrayDefault(),
	creator: stringDefault(),
	character_version: stringDefault(),
	extensions: recordDefault(),
})

export const CharacterCardV2Schema = z.object({
	spec: z.literal('chara_card_v2'),
	spec_version: z.string().default('2.0'),
	data: CharacterCardV2DataSchema,
})

export type CharacterCardV2Data = z.infer<typeof CharacterCardV2DataSchema>
export type CharacterCardV2 = z.infer<typeof CharacterCardV2Schema>
