<script setup lang="ts">
import { FolderOpen, Info } from '@lucide/vue'
import ThemeButton from '@renderer/components/shared/ThemeButton.vue'
import { Button } from '@renderer/components/ui/button'
import { api } from '@renderer/services/api'
import { useStudioStore } from '@renderer/stores/studio'
import appIcon from '../../../../../resources/icon.png'

const studio = useStudioStore()
const isMacOS = window.platform === 'darwin'

async function switchWorkspace() {
  const selected = await studio.execute(() => api.selectDirectory({ title: '切换 Workspace' }))
  if (selected?.path) await studio.openWorkspace(selected.path)
}
</script>

<template>
  <header
    class="
      app-drag relative flex h-11 shrink-0 items-center
      border-b border-border bg-background select-none
    "
  >
    <div v-if="isMacOS" class="w-24 shrink-0" />
    <div v-else class="w-3 shrink-0" />

    <div class="flex min-w-0 items-center gap-3">
      <img v-if="!isMacOS" :src="appIcon" alt="" class="size-5 shrink-0 object-contain">
      <span class="shrink-0 text-sm font-semibold text-foreground"> Kirika Studio </span>
    </div>

    <!-- right -->
    <div
      class="titlebar-actions app-no-drag ml-auto flex items-center gap-1 pl-2"
      :class="isMacOS ? 'pr-3' : ''"
    >
      <ThemeButton />

      <Button
        type="button"
        variant="ghost"
        size="icon"
        class="size-7 text-muted-foreground"
        title="关于 Kirika Studio"
        aria-label="关于 Kirika Studio"
        @click="api.openAboutWindow"
      >
        <Info />
      </Button>

      <Button
        variant="ghost"
        size="icon-sm"
        title="切换 Workspace"
        class="size-7 text-muted-foreground"
        @click="switchWorkspace"
      >
        <FolderOpen :size="16" />
      </Button>
    </div>
  </header>
</template>

<style scoped>
@supports (width: env(titlebar-area-width)) {
  .titlebar-actions {
    margin-right: calc(100vw - env(titlebar-area-x) - env(titlebar-area-width));
  }
}
</style>
