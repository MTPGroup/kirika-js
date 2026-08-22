import { defineConfig } from 'tsdown/config'

export default defineConfig({
  entry: {
    index: 'src/index.ts',
    character: 'src/character/index.ts',
    conversation: 'src/conversation/index.ts',
    lorebook: 'src/lorebook/index.ts',
    shared: 'src/shared/index.ts',
  },
  exports: true,
  clean: true,
  dts: true,
  format: ['esm', 'cjs'],
})
