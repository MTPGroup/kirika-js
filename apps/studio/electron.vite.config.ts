import { resolve } from 'node:path'
import tailwindcss from '@tailwindcss/vite'
import vue from '@vitejs/plugin-vue'
import { defineConfig } from 'electron-vite'
import VueRouter from 'vue-router/vite'

const srcDir = resolve(import.meta.dirname, 'src')

export default defineConfig({
  main: {
    resolve: {
      alias: {
        '~': srcDir,
      },
    },
  },
  preload: {
    resolve: {
      alias: {
        '~': srcDir,
      },
    },
  },
  renderer: {
    resolve: {
      alias: {
        '@renderer': resolve(import.meta.dirname, 'src/renderer/src'),
        '~': srcDir,
      },
    },
    plugins: [
      VueRouter({
        routesFolder: 'src/renderer/src/pages',
        dts: 'src/renderer/src/route-map.d.ts',
      }),
      vue(),
      tailwindcss(),
    ],
  },
})
