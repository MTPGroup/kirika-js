import { defineConfig } from 'tsdown'

export default defineConfig({
  entry: ['./src/index.ts'],
  format: ['esm'],
  dts: true,
  sourcemap: true,
  clean: true,
  exports: true,
  outDir: './dist',
  copy: [
    {
      from: './drizzle',
      to: './dist',
    },
  ],
  deps: {
    neverBundle: [/^@kirika-js\//, 'drizzle-orm', '@libsql/client'],
  },
})
