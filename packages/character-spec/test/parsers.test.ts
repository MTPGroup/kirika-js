import fs from 'node:fs'
import path from 'node:path'
import { describe, expect, test } from 'vitest'
import { parseJsonCharacterCard, parsePngCharacterCard } from '../src/parsers'
import { createValidV1Card, createValidV2Card } from './helpers/cards'

describe('parseJsonCharacterCard', () => {
	test('严格解析标准 CCv2 JSON', () => {
		const card = createValidV2Card({
			name: '爱丽丝',
			alternate_greetings: ['嗨！', '早安！'],
			extensions: { 'test/value': { enabled: true } },
		})
		expect(parseJsonCharacterCard(JSON.stringify(card))).toEqual(card)
	})

	test('将字段完整的 TavernAI V1 升级为 CCv2', () => {
		const v1 = createValidV1Card({ name: '旧版角色' })
		const result = parseJsonCharacterCard(JSON.stringify(v1))

		expect(result).toEqual({
			spec: 'chara_card_v2',
			spec_version: '2.0',
			data: {
				...v1,
				creator_notes: '',
				system_prompt: '',
				post_history_instructions: '',
				alternate_greetings: [],
				tags: [],
				creator: '',
				character_version: '',
				extensions: {},
			},
		})
	})

	test('拒绝缺失字段、错误类型和 extensions 外的未知字段', () => {
		expect(() =>
			parseJsonCharacterCard(
				JSON.stringify({ ...createValidV1Card(), personality: null }),
			),
		).toThrow()
		expect(() =>
			parseJsonCharacterCard(
				JSON.stringify({
					...createValidV2Card(),
					data: { name: 'Incomplete' },
				}),
			),
		).toThrow()
		expect(() =>
			parseJsonCharacterCard(
				JSON.stringify({
					...createValidV2Card(),
					data: { ...createValidV2Card().data, avatar: 'avatar.png' },
				}),
			),
		).toThrow()
	})

	test('支持 UTF-8 Uint8Array，并拒绝非法 UTF-8', () => {
		const input = new TextEncoder().encode(
			JSON.stringify(createValidV2Card({ name: '辉夜 🌙' })),
		)
		expect(parseJsonCharacterCard(input).data.name).toBe('辉夜 🌙')
		expect(() =>
			parseJsonCharacterCard(new Uint8Array([0x7b, 0xff, 0x7d])),
		).toThrow()
	})

	test('拒绝无效 JSON、非对象根节点和错误规范版本', () => {
		expect(() => parseJsonCharacterCard('invalid json')).toThrow(
			'Failed to parse JSON string',
		)
		for (const input of ['null', '42', '"plain text"', '[]']) {
			expect(() => parseJsonCharacterCard(input)).toThrow(
				'Invalid character card format: Root must be an object',
			)
		}
		expect(() =>
			parseJsonCharacterCard(
				JSON.stringify({ ...createValidV2Card(), spec_version: '2.1' }),
			),
		).toThrow()
	})
})

describe('parsePngCharacterCard', () => {
	test('严格拒绝真实文件中的非标准字段和无角色卡数据', () => {
		const extendedCard = fs.readFileSync(
			path.join(__dirname, 'fixtures/valid-card.png'),
		)
		expect(() => parsePngCharacterCard(extendedCard)).toThrow()

		const noCard = fs.readFileSync(
			path.join(__dirname, 'fixtures/invalid-card.png'),
		)
		expect(() => parsePngCharacterCard(noCard)).toThrow()
	})
})
