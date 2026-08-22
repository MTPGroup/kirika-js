import { defineConfig } from 'tsdown/config'

export default defineConfig({
  entry: {
    index: 'src/index.ts',
    'testing/index': 'src/testing/index.ts',
  },
  clean: true,
  dts: true,
  format: ['esm', 'cjs'],
})
