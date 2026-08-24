<script setup lang="ts">
import { FolderOpen, Search } from '@lucide/vue'
import ThemeButton from '@renderer/components/shared/ThemeButton.vue'
import { Button } from '@renderer/components/ui/button'
import { api } from '@renderer/services/api'
import { useStudioStore } from '@renderer/stores/studio'

const studio = useStudioStore()

async function switchWorkspace() {
  const selected = await studio.execute(() =>
    api.selectDirectory({ title: '切换 Workspace' }),
  )
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
    <!-- macOS traffic lights 占位 -->
    <div class="w-24 shrink-0" />

    <!-- left -->
    <div class="flex min-w-0 items-center gap-3">
      <span class="shrink-0 text-sm font-semibold text-foreground">
        Kirika Studio
      </span>
    </div>

    <!-- right -->
    <div class="app-no-drag ml-auto flex items-center gap-1 pr-3">
      <Button
        type="button"
        variant="ghost"
        size="icon"
        class="size-7 text-muted-foreground"
      >
        <Search :size="16" />
      </Button>

      <ThemeButton />

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
