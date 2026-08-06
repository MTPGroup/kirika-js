import { z } from 'zod'
import { ExtensionsSchema } from './helpers'
import { CharacterBookSchema } from './lorebook-schema'

export const TavernCardV1Schema = z.strictObject({
	name: z.string(),
	description: z.string(),
	personality: z.string(),
	scenario: z.string(),
	first_mes: z.string(),
	mes_example: z.string(),
})

export const CharacterCardV2DataSchema = z.strictObject({
	name: z.string(),
	description: z.string(),
	personality: z.string(),
	scenario: z.string(),
	first_mes: z.string(),
	mes_example: z.string(),

	creator_notes: z.string(),
	system_prompt: z.string(),
	post_history_instructions: z.string(),
	alternate_greetings: z.array(z.string()),
	character_book: CharacterBookSchema.optional(),

	tags: z.array(z.string()),
	creator: z.string(),
	character_version: z.string(),
	extensions: ExtensionsSchema,
})

export const CharacterCardV2Schema = z.strictObject({
	spec: z.literal('chara_card_v2'),
	spec_version: z.literal('2.0'),
	data: CharacterCardV2DataSchema,
})

export type TavernCardV1 = z.infer<typeof TavernCardV1Schema>
export type CharacterCardV2Data = z.infer<typeof CharacterCardV2DataSchema>
export type CharacterCardV2 = z.infer<typeof CharacterCardV2Schema>
