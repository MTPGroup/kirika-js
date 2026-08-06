import { defineConfig } from 'vitest/config'

export default defineConfig({
	test: {
		name: 'character-spec',
		environment: 'node',
		include: ['test/**/*.test.ts'],
	},
})
