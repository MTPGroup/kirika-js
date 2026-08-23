<script setup lang="ts">
import { HelpCircle, Search } from '@lucide/vue'
import ThemeButton from '@renderer/components/shared/ThemeButton.vue'
import { Avatar, AvatarFallback } from '@renderer/components/ui/avatar'
import { Button } from '@renderer/components/ui/button'

const { settings } = {
  settings: {
    model: 'Deepseek v4',
  },
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

    <!-- center -->
    <div
      class="
        app-no-drag absolute left-1/2
        flex -translate-x-1/2 items-center gap-3
      "
    >
      <Button
        type="button"
        variant="secondary"
        size="sm"
        class="h-7 rounded-lg px-3 text-xs font-semibold"
      >
        {{ settings.model }}
      </Button>

      <div
        class="
          flex h-7 items-center gap-2
          rounded-lg border border-border
          bg-secondary px-3
          text-xs font-semibold
        "
      >
        <span
          class="
            size-2 rounded-full
            bg-success
            shadow-[0_0_6px_var(--success)]
          "
        />

        <span class="text-success"> Connected </span>
      </div>
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

      <Button
        type="button"
        variant="ghost"
        size="icon"
        class="size-7 text-muted-foreground"
      >
        <HelpCircle :size="16" />
      </Button>

      <ThemeButton />

      <Avatar class="size-7">
        <!-- <AvatarImage :src="" /> -->
        <AvatarFallback>Sen</AvatarFallback>
      </Avatar>
    </div>
  </header>
</template>
