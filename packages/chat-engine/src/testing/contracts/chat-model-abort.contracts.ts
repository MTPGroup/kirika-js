import { ChatModelAbortError } from '../../errors'
import type { ChatModelRequest } from '../../model/chat-model'
import type { ChatModelPort } from '../../ports/chat-model.port'
import type { ContractTestRunner } from './types'

export function chatModelAbortContract(
	createModel: () => ChatModelPort,
	runner: ContractTestRunner,
) {
	const { describe, it, expect } = runner

	describe('ChatModelAbort 契约测试', () => {
		it('应该在生成开始前取消时抛出 ChatModelAbortError', async () => {
			const model = createModel()

			const controller = new AbortController()

			controller.abort()

			await expect(
				drainStream(model.generate(createRequest(), controller.signal)),
			).rejects.toBeInstanceOf(ChatModelAbortError)
		})

		it('应该在生成过程中取消时抛出 ChatModelAbortError', async () => {
			const model = createModel()

			const controller = new AbortController()

			await expect(
				drainStream(model.generate(createRequest(), controller.signal), () => {
					controller.abort()
				}),
			).rejects.toBeInstanceOf(ChatModelAbortError)
		})
	})
}

function createRequest(): ChatModelRequest {
	return {
		model: 'test-model',
		messages: [
			{
				role: 'user',
				content: [
					{
						type: 'text' as const,
						text: '你好',
					},
				],
			},
		],
	}
}

async function drainStream(
	stream: AsyncIterable<unknown>,
	beforeNext?: () => void,
): Promise<void> {
	let first = true

	for await (const _ of stream) {
		if (first && beforeNext) {
			first = false
			beforeNext()
		}
	}
}
