<script setup lang="ts">
import type { Component } from 'vue'

const props = defineProps<{
  title: string
  description?: string
  icon?: Component
}>()
</script>

<template>
  <div
    class="
      flex flex-col items-center justify-center
      rounded-2xl border border-dashed border-border
      bg-card/40 px-6 py-16 text-center
    "
  >
    <div
      v-if="props.icon"
      class="
        flex size-12 items-center justify-center rounded-xl
        border border-border bg-muted text-muted-foreground
      "
    >
      <component :is="props.icon" :size="22" :stroke-width="1.5" />
    </div>

    <h3 class="text-foreground mt-4 text-base font-semibold">
      {{ props.title }}
    </h3>

    <p
      v-if="props.description"
      class="text-muted-foreground mt-1.5 max-w-sm text-sm leading-relaxed"
    >
      {{ props.description }}
    </p>

    <div v-if="$slots.default" class="mt-5">
      <slot />
    </div>
  </div>
</template>
