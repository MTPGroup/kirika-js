<script setup lang="ts">
import { Check, Monitor, Moon, Sun } from '@lucide/vue'

import { Button } from '@renderer/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@renderer/components/ui/dropdown-menu'

import { type Theme, useThemeStore } from '@renderer/stores/theme'

const theme = useThemeStore()

const items: {
  label: string
  value: Theme
  icon: typeof Sun
}[] = [
  {
    label: 'Light',
    value: 'light',
    icon: Sun,
  },
  {
    label: 'Dark',
    value: 'dark',
    icon: Moon,
  },
  {
    label: 'System',
    value: 'system',
    icon: Monitor,
  },
]
</script>

<template>
  <DropdownMenu>
    <DropdownMenuTrigger as-child>
      <Button variant="ghost" size="icon" class="size-7 text-muted-foreground">
        <Sun v-if="theme.resolvedTheme === 'light'" :size="16" />

        <Moon v-else :size="16" />
      </Button>
    </DropdownMenuTrigger>

    <DropdownMenuContent align="end">
      <DropdownMenuItem
        v-for="item in items"
        :key="item.value"
        class="gap-2"
        @select="theme.setTheme(item.value)"
      >
        <component :is="item.icon" :size="16" />

        <span>{{ item.label }}</span>

        <Check v-if="theme.theme === item.value" class="ml-auto" :size="14" />
      </DropdownMenuItem>
    </DropdownMenuContent>
  </DropdownMenu>
</template>
