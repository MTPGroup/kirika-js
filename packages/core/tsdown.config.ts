import { defineConfig } from 'tsdown/config'

export default defineConfig({
  entry: {
    index: 'src/index.ts',
    domain: 'src/domain/index.ts',
    'domain/character': 'src/domain/character/index.ts',
    'domain/conversation': 'src/domain/conversation/index.ts',
    'domain/lorebook': 'src/domain/lorebook/index.ts',
    'domain/shared': 'src/domain/shared/index.ts',
    chat: 'src/chat/index.ts',
    'chat/testing': 'src/chat/testing/index.ts',
    'character-card': 'src/character-card/index.ts',
  },
  exports: false,
  clean: true,
  dts: true,
  format: ['esm', 'cjs'],
})
