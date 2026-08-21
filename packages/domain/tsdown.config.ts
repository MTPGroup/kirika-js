import { defineConfig } from 'tsdown/config'

export default defineConfig({
	entry: {
		index: 'src/index.ts',
		'character/index': 'src/character/index.ts',
		'conversation/index': 'src/conversation/index.ts',
		'lorebook/index': 'src/lorebook/index.ts',
		'shared/index': 'src/shared/index.ts',
	},
	clean: true,
	dts: {
		cjsReexport: true,
	},
	format: ['esm', 'cjs'],
})
