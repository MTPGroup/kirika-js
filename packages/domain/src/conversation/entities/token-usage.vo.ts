export interface TokenUsageProps {
	promptTokens: number
	completionTokens: number
}

export class TokenUsage {
	readonly promptTokens: number
	readonly completionTokens: number

	constructor(props: TokenUsageProps) {
		TokenUsage.assertTokenCount(props.promptTokens, '输入')
		TokenUsage.assertTokenCount(props.completionTokens, '输出')

		this.promptTokens = props.promptTokens
		this.completionTokens = props.completionTokens
		if (!Number.isSafeInteger(this.totalTokens)) {
			throw new Error('Token 总数超出安全整数范围')
		}
	}

	get totalTokens(): number {
		return this.promptTokens + this.completionTokens
	}

	equals(other: TokenUsage): boolean {
		return (
			this.promptTokens === other.promptTokens &&
			this.completionTokens === other.completionTokens
		)
	}

	private static assertTokenCount(value: number, label: string): void {
		if (!Number.isSafeInteger(value) || value < 0) {
			throw new Error(`${label} Token 数必须是非负安全整数`)
		}
	}
}
