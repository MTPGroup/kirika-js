import { defineConfig } from 'tsdown/config'

export default defineConfig({
  entry: {
    index: 'src/index.ts',
  },
  exports: true,
  clean: true,
  dts: true,
  format: ['esm', 'cjs'],
})
