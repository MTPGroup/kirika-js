import { resolve } from 'node:path'
import swc from 'unplugin-swc'
import { defineConfig } from 'vitest/config'

export default defineConfig({
	test: {
		globals: true,
		root: './',
		include: ['src/**/*.spec.ts'],
		exclude: ['dist/**'],
	},
	plugins: [
		swc.vite({
			module: { type: 'es6' },
			jsc: {
				target: 'es2022',
			},
		}),
	],
	resolve: {
		alias: {
			'~': resolve(import.meta.dirname, './src'),
		},
	},
})
