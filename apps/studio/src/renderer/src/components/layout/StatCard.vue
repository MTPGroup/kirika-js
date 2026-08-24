<script setup lang="ts">
import type { Component } from 'vue'

type StatAccent = 'default' | 'primary' | 'success'

const props = withDefaults(
  defineProps<{
    label: string
    value: string | number
    hint?: string
    icon: Component
    accent?: StatAccent
  }>(),
  {
    accent: 'default',
  },
)

const accentClasses = {
  default: 'bg-muted text-muted-foreground',
  primary: 'bg-primary/10 text-primary',
  success: 'bg-success/10 text-success',
} satisfies Record<StatAccent, string>
</script>

<template>
  <div
    class="
    flex items-center gap-4 rounded-xl
    border border-border bg-card
    px-4 py-3.5
  "
  >
    <div
      class="
      flex size-10 shrink-0 items-center
      justify-center rounded-xl
    "
      :class="accentClasses[props.accent]"
    >
      <component :is="props.icon" :size="18" :stroke-width="1.75" />
    </div>

    <div class="min-w-0">
      <div class="flex items-baseline gap-2">
        <span class="text-sm text-muted-foreground">
          {{ props.label }}
        </span>

        <span
          class="
          text-xl font-semibold
          tabular-nums text-foreground
        "
        >
          {{ props.value }}
        </span>
      </div>

      <p v-if="props.hint" class="mt-1 text-xs text-muted-foreground">
        {{ props.hint }}
      </p>
    </div>
  </div>
</template>
