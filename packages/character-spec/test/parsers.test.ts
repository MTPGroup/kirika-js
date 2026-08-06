import fs from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import { parseJsonCharacterCard, parsePngCharacterCard } from '../src/parsers'

describe('parseJsonCharacterCard', () => {
	it('应该能够成功解析标准 CCv2 JSON 格式', () => {
		const validCCv2Json = JSON.stringify({
			spec: 'chara_card_v2',
			spec_version: '2.0',
			data: {
				name: '爱丽丝',
				description: '性格温和的 AI 助手。',
				personality: '友善、细心',
				scenario: '在实验室中',
				first_mes: '你好！有什么我可以帮你的？',
				mes_example: '<user>: 你好\n<bot>: 你好呀！',
				creator_notes: '测试角色卡',
				system_prompt: '',
				post_history_instructions: '',
				alternate_greetings: ['嗨！', '早安！'],
				tags: ['AI', '助手'],
				creator: 'Developer',
				character_version: '1.0',
				extensions: {},
			},
		})

		const result = parseJsonCharacterCard(validCCv2Json)

		expect(result.spec).toBe('chara_card_v2')
		expect(result.data.name).toBe('爱丽丝')
		expect(result.data.alternate_greetings).toEqual(['嗨！', '早安！'])
	})

	it('应该能够将 TavernAI V1 平铺格式自动升级为 CCv2', () => {
		const v1Json = JSON.stringify({
			name: '旧版角色',
			description: '这是一个旧版 TavernAI 角色卡',
			personality: '沉稳',
			scenario: '无',
			first_mes: '你好。',
			mes_example: '',
		})

		const result = parseJsonCharacterCard(v1Json)

		expect(result.spec).toBe('chara_card_v2')
		expect(result.spec_version).toBe('2.0')
		expect(result.data.name).toBe('旧版角色')
		expect(result.data.description).toBe('这是一个旧版 TavernAI 角色卡')
	})

	it('对于缺失的可选字段，应该自动使用默认安全值（如空字符串/空数组）', () => {
		const incompleteJson = JSON.stringify({
			spec: 'chara_card_v2',
			spec_version: '2.0',
			data: {
				name: '测试角色',
				// 故意缺失 description, personality 等，甚至传入 null
				description: null,
				alternate_greetings: null,
			},
		})

		const result = parseJsonCharacterCard(incompleteJson)

		expect(result.data.name).toBe('测试角色')
		expect(result.data.description).toBe('')
		expect(result.data.alternate_greetings).toEqual([])
		expect(result.data.extensions).toEqual({})
	})

	it('对于无效的 JSON 文本，应该抛出 Error 异常', () => {
		expect(() => parseJsonCharacterCard('invalid json string')).toThrow(
			/Failed to parse JSON/,
		)
	})
})

describe('parsePngCharacterCard', () => {
	it('非法 PNG 魔数头应该直接抛出 Invalid .png file header 错误', () => {
		const invalidBuffer = new Uint8Array([0x00, 0x01, 0x02, 0x03, 0x04])
		expect(() => parsePngCharacterCard(invalidBuffer)).toThrow(
			/Invalid .png file header/,
		)
	})

	it('应该能成功从真实 PNG 角色卡图片中解析出 spec', () => {
		const fixturePath = path.join(__dirname, 'fixtures/valid-card.png')
		if (fs.existsSync(fixturePath)) {
			const buffer = fs.readFileSync(fixturePath)
			const card = parsePngCharacterCard(buffer)
			expect(card.spec).toBe('chara_card_v2')
		}
	})

	it('应该无法从错误的 PNG 图片中解析出角色卡并抛出异常', () => {
		const fixturePath = path.join(__dirname, 'fixtures/invalid-card.png')
		const buffer = fs.readFileSync(fixturePath)
		expect(() => parsePngCharacterCard(buffer)).toThrow()
	})
})
