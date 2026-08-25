import { resolve } from 'node:path'
import { sharedConfig } from '@kirika-js/vitest-config'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  ...sharedConfig,
  resolve: {
    alias: {
      '~': resolve(import.meta.dirname, 'src'),
    },
  },
  test: {
    ...sharedConfig.test,
  },
})
