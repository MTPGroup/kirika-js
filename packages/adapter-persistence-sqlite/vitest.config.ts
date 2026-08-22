import { sharedConfig } from '@kirika-js/vitest-config'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  ...sharedConfig,
  test: {
    ...sharedConfig.test,
  },
})
