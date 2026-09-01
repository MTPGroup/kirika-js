<script setup lang="ts">
import { Heart, Monitor, Moon, Star, Sun } from '@lucide/vue'

import { Button } from '@renderer/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@renderer/components/ui/dropdown-menu'

import { type Appearance, type CharacterTheme, useThemeStore } from '@renderer/stores/theme'

const theme = useThemeStore()

const appearanceItems: {
  label: string
  value: Appearance
  icon: typeof Sun
}[] = [
  {
    label: '浅色',
    value: 'light',
    icon: Sun,
  },
  {
    label: '深色',
    value: 'dark',
    icon: Moon,
  },
  {
    label: '跟随系统',
    value: 'system',
    icon: Monitor,
  },
]

const characterItems: {
  label: string
  value: CharacterTheme
  icon: typeof Star
}[] = [
  {
    label: 'Kirika',
    value: 'kirika',
    icon: Star,
  },
  {
    label: 'Shirabe',
    value: 'shirabe',
    icon: Heart,
  },
]
</script>

<template>
  <DropdownMenu>
    <DropdownMenuTrigger as-child>
      <Button variant="ghost" size="icon" class="size-7 text-muted-foreground">
        <Sun v-if="theme.resolvedAppearance === 'light'" :size="16" />

        <Moon v-else :size="16" />
      </Button>
    </DropdownMenuTrigger>

    <DropdownMenuContent align="end" class="w-44">
      <DropdownMenuLabel> 外观 </DropdownMenuLabel>

      <DropdownMenuRadioGroup
        :model-value="theme.appearance"
        @update:model-value="theme.setAppearance($event as Appearance)"
      >
        <DropdownMenuRadioItem
          v-for="item in appearanceItems"
          :key="item.value"
          :value="item.value"
        >
          <component :is="item.icon" />
          <span>{{ item.label }}</span>
        </DropdownMenuRadioItem>
      </DropdownMenuRadioGroup>

      <DropdownMenuSeparator />

      <DropdownMenuLabel> 角色主题 </DropdownMenuLabel>

      <DropdownMenuRadioGroup
        :model-value="theme.characterTheme"
        @update:model-value="theme.setCharacterTheme($event as CharacterTheme)"
      >
        <DropdownMenuRadioItem v-for="item in characterItems" :key="item.value" :value="item.value">
          <component :is="item.icon" />
          <span>{{ item.label }}</span>
        </DropdownMenuRadioItem>
      </DropdownMenuRadioGroup>
    </DropdownMenuContent>
  </DropdownMenu>
</template>
