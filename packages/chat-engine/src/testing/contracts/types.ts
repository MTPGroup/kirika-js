export interface ContractTestRunner {
	describe(name: string, fn: () => void): void

	it(name: string, fn: () => void | Promise<void>): void

	expect: (...args: any[]) => any
}
