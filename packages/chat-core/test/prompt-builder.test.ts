import type { CharacterCardV2 } from '@kirika-js/character-spec'
import { describe, expect, test } from 'vitest'
import {
	createMessageTreeFromCard,
	type MessageContent,
	MessageTree,
	PromptBuilder,
	type PromptTokenizer,
} from '../src'

function estimateContentTokens(content: MessageContent): number {
	if (typeof content === 'string') return content.length

	return content.reduce((tokens, part) => {
		return tokens + (part.type === 'text' ? part.text.length : 0)
	}, 0)
}

function createTokenizer(protocolOverheadTokens = 0): PromptTokenizer {
	return {
		estimateContentTokens,
		estimateMessageTokens(message) {
			return estimateContentTokens(message.content)
		},
		estimatePromptTokens(prompt) {
			const systemPromptTokens = estimateContentTokens(prompt.systemPrompt)
			const messageTokens = prompt.messages.map((message) =>
				estimateContentTokens(message.content),
			)
			const postHistoryInstructionTokens = estimateContentTokens(
				prompt.postHistoryInstructions,
			)

			return {
				systemPromptTokens,
				messageTokens,
				postHistoryInstructionTokens,
				protocolOverheadTokens,
				totalInputTokens:
					systemPromptTokens +
					messageTokens.reduce((sum, tokens) => sum + tokens, 0) +
					postHistoryInstructionTokens +
					protocolOverheadTokens,
			}
		},
	}
}

const tokenizer = createTokenizer()

function createCard(
	overrides: Partial<CharacterCardV2['data']> = {},
): CharacterCardV2 {
	return {
		spec: 'chara_card_v2',
		spec_version: '2.0',
		data: {
			name: '露娜',
			description: '',
			personality: '',
			scenario: '',
			first_mes: '',
			mes_example: '',
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

describe('PromptBuilder 令牌预算', () => {
	test('计算必选系统块与可选系统块之间的分隔符', () => {
		const payload = new PromptBuilder(tokenizer).build({
			card: createCard({ system_prompt: '甲', personality: '乙' }),
			tree: new MessageTree(),
			userName: '用户',
			maxContentTokens: 17,
			reserveResponseTokens: 0,
		})

		expect(payload.systemPrompt).toBe('甲')
		expect(payload.estimatedTokens).toBeLessThanOrEqual(17)
	})

	test('最新用户消息超出预算时抛出异常而不是静默丢弃', () => {
		const tree = new MessageTree()
		tree.addNode('user', '1234567890')

		expect(() =>
			new PromptBuilder(tokenizer).build({
				card: createCard({ system_prompt: '甲' }),
				tree,
				userName: '用户',
				maxContentTokens: 10,
				reserveResponseTokens: 0,
			}),
		).toThrow(/latest conversational turn exceed token budget/i)
	})

	test('优先丢弃最新用户消息之前的旧历史记录', () => {
		const tree = new MessageTree()
		tree.addNode('assistant', '1234567890')
		tree.addNode('user', '好吧')

		const payload = new PromptBuilder(tokenizer).build({
			card: createCard({ system_prompt: '甲' }),
			tree,
			userName: '用户',
			maxContentTokens: 3,
			reserveResponseTokens: 0,
		})

		expect(payload.messages).toEqual([{ role: 'user', content: '好吧' }])
		expect(payload.estimatedTokens).toBe(3)
	})

	test('将协议开销计入输入令牌预算', () => {
		const payload = new PromptBuilder(createTokenizer(2)).build({
			card: createCard({ system_prompt: '甲' }),
			tree: new MessageTree(),
			userName: '用户',
			maxContentTokens: 3,
			reserveResponseTokens: 0,
		})

		expect(payload.estimatedTokens).toBe(3)
	})
})

describe('PromptBuilder 的 Character Card V2 字段语义', () => {
	test('保持角色描述独立并正确放置角色卡指令', () => {
		const tree = new MessageTree()
		tree.addNode('user', '你好')

		const payload = new PromptBuilder(tokenizer).build({
			card: createCard({
				description: '侦探{{char}}',
				system_prompt: '角色卡 {{original}} {{char}}',
				post_history_instructions: '后置指令 {{original}} {{user}}',
				creator_notes: '不应进入提示词',
				tags: ['不应进入提示词的标签'],
			}),
			tree,
			userName: '爱丽丝',
			defaultSystemPrompt: '全局指令 {{char}}',
			defaultPostHistoryInstructions: '默认后置指令 {{user}}',
			maxContentTokens: 200,
			reserveResponseTokens: 0,
		})

		expect(payload.systemPrompt).toContain('角色卡 全局指令 露娜 露娜')
		expect(payload.systemPrompt).toContain('[Character Description]:\n侦探露娜')
		expect(payload.systemPrompt).not.toContain('不应进入提示词')
		expect(payload.systemPrompt).not.toContain('不应进入提示词的标签')
		expect(payload.postHistoryInstructions).toBe(
			'后置指令 默认后置指令 爱丽丝 爱丽丝',
		)
		expect(payload.messages.at(-1)).toEqual({ role: 'user', content: '你好' })
	})

	test('激活并正确放置 Character Book 条目', () => {
		const tree = new MessageTree()
		tree.addNode('user', '告诉我关于银港的事情')

		const payload = new PromptBuilder(tokenizer).build({
			card: createCard({
				description: '一名侦探',
				character_book: {
					extensions: {},
					entries: [
						{
							keys: ['银港'],
							content: '这座城市建在运河之上。',
							extensions: {},
							enabled: true,
							insertion_order: 1,
							position: 'before_char',
						},
						{
							keys: ['始终'],
							content: '露娜随身携带一本笔记本。',
							extensions: {},
							enabled: true,
							insertion_order: 2,
							constant: true,
							position: 'after_char',
						},
					],
				},
			}),
			tree,
			userName: '爱丽丝',
			maxContentTokens: 300,
			reserveResponseTokens: 0,
		})

		const beforeLore = payload.systemPrompt.indexOf('城市建在运河之上')
		const description = payload.systemPrompt.indexOf('一名侦探')
		const afterLore = payload.systemPrompt.indexOf('携带一本笔记本')

		expect(beforeLore).toBeLessThan(description)
		expect(description).toBeLessThan(afterLore)
		expect(payload.activatedLorebookKeys).toEqual(['银港', '始终'])
	})

	test('创建初始助手消息及备选问候语滑动项', () => {
		const card = createCard({
			first_mes: '你好，{{user}}，我是{{char}}。',
			alternate_greetings: ['给{{user}}的另一种问候。'],
		})

		expect(
			createMessageTreeFromCard(card, { userName: '爱丽丝' }).getActivePath()[0]
				.content,
		).toBe('你好，爱丽丝，我是露娜。')
		expect(
			createMessageTreeFromCard(card, {
				userName: '爱丽丝',
				greetingIndex: 1,
			}).getActivePath()[0].content,
		).toBe('给爱丽丝的另一种问候。')
	})
})
