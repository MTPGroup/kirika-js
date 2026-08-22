import { resolve } from 'node:path'
import { baseConfig } from '@kirika-js/vitest-config'
import swc from 'unplugin-swc'
import { defineConfig, mergeConfig } from 'vitest/config'

export default mergeConfig(
  baseConfig,
  defineConfig({
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
  }),
)
