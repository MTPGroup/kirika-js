import swc from 'unplugin-swc'
import { defineConfig } from 'vitest/config'

export default defineConfig({
	test: {
		include: ['test/**/*.e2e-spec.ts'],
		environment: 'node',

		fileParallelism: false,

		testTimeout: 30_000,
		hookTimeout: 60_000,
		teardownTimeout: 30_000,

		clearMocks: true,
		restoreMocks: true,

		globalSetup: ['./test/global-setup.ts'],
		setupFiles: ['./test/helpers/setup-env.ts'],
	},
	plugins: [
		swc.vite({
			jsc: {
				target: 'es2022',
			},
		}),
	],
})
