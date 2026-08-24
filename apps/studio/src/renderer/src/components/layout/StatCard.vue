<script setup lang="ts">
import type { Component } from 'vue'

const props = withDefaults(
  defineProps<{
    label: string
    value: string | number
    hint?: string
    icon: Component
    tone?: 'default' | 'primary' | 'success' | 'muted'
  }>(),
  {
    tone: 'default',
  },
)

const toneClasses: Record<string, string> = {
  default: 'text-muted-foreground bg-muted',
  primary: 'text-primary bg-primary/10',
  success: 'text-success bg-success/10',
  muted: 'text-muted-foreground bg-muted/60',
}
</script>

<template>
  <div
    class="
      flex items-start gap-3.5 rounded-2xl border border-border
      bg-card p-4
      shadow-[inset_0_1px_0_0_var(--card)] transition-colors
      hover:border-border/80
    "
  >
    <div
      class="flex size-10 shrink-0 items-center justify-center rounded-xl"
      :class="toneClasses[props.tone ?? 'default']"
    >
      <component :is="props.icon" :size="19" :stroke-width="1.75" />
    </div>

    <div class="min-w-0">
      <p class="text-muted-foreground text-[12px] font-medium leading-none">
        {{ props.label }}
      </p>

      <p
        class="text-foreground mt-1.5 text-2xl font-semibold tabular-nums tracking-tight"
      >
        {{ props.value }}
      </p>

      <p v-if="props.hint" class="text-muted-foreground mt-1 text-xs">
        {{ props.hint }}
      </p>
    </div>
  </div>
</template>
