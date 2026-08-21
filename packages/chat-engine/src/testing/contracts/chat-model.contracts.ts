import type { ChatModelStreamEvent } from '../../model/chat-model'
import type { ChatModelPort } from '../../ports/chat-model.port'
import type { ContractTestRunner } from './types'

export function chatModelContract(
	createModel: () => ChatModelPort,
	runner: ContractTestRunner,
) {
	const { describe, it, expect } = runner

	describe('ChatModelPort 契约测试', () => {
		it('应该能够流式返回文本增量事件', async () => {
			const model = createModel()

			const events = await collectEvents(
				model.generate({
					model: 'test-model',
					messages: [
						{
							role: 'user',
							content: [
								{
									type: 'text',
									text: '你好',
								},
							],
						},
					],
				}),
			)

			expect(events.some((event) => event.type === 'text_delta')).toBe(true)
		})

		it('应该能够返回完成事件', async () => {
			const model = createModel()

			const events = await collectEvents(
				model.generate({
					model: 'test-model',
					messages: [
						{
							role: 'user',
							content: [
								{
									type: 'text',
									text: '你好',
								},
							],
						},
					],
				}),
			)

			const finish = events.find((event) => event.type === 'finish')

			expect(finish).toBeDefined()

			expect(finish?.type).toBe('finish')
		})

		it('应该支持 token usage 信息', async () => {
			const model = createModel()

			const events = await collectEvents(
				model.generate({
					model: 'test-model',
					messages: [
						{
							role: 'user',
							content: [
								{
									type: 'text',
									text: '你好',
								},
							],
						},
					],
				}),
			)

			const finish = events.find((event) => event.type === 'finish')

			expect(finish?.type).toBe('finish')

			if (finish?.type === 'finish') {
				expect(finish.tokenUsage).toBeDefined()
			}
		})
	})
}

async function collectEvents(
	stream: AsyncIterable<ChatModelStreamEvent>,
): Promise<ChatModelStreamEvent[]> {
	const events: ChatModelStreamEvent[] = []

	for await (const event of stream) {
		events.push(event)
	}

	return events
}
