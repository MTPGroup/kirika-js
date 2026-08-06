import type {
	CharacterCardV2,
	CharacterCardV2Data,
	TavernCardV1,
} from '../../src/validators'

export function createValidV1Card(
	overrides: Partial<TavernCardV1> = {},
): TavernCardV1 {
	return {
		name: 'Alice',
		description: 'A helpful assistant.',
		personality: 'Friendly and careful.',
		scenario: 'Inside a laboratory.',
		first_mes: 'Hello!',
		mes_example: '<START>\n{{user}}: Hello\n{{char}}: Hi!',
		...overrides,
	}
}

export function createValidV2Card(
	overrides: Partial<CharacterCardV2Data> = {},
): CharacterCardV2 {
	return {
		spec: 'chara_card_v2',
		spec_version: '2.0',
		data: {
			...createValidV1Card(),
			creator_notes: '',
			system_prompt: '',
			post_history_instructions: '',
			alternate_greetings: [],
			tags: [],
			creator: '',
			character_version: '',
			extensions: {},
			...overrides,
		},
	}
}
