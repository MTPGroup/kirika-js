<script setup lang="ts">
import type { Component } from 'vue'

const props = defineProps<{
  eyebrow?: string
  title: string
  description?: string
  icon?: Component
}>()
</script>

<template>
  <header
    class="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between"
  >
    <div class="flex min-w-0 items-start gap-3.5">
      <div
        v-if="props.icon"
        class="
          flex size-10 shrink-0 items-center justify-center
          rounded-xl border border-border
          bg-muted/60 text-muted-foreground
        "
      >
        <component :is="props.icon" :size="19" :stroke-width="1.75" />
      </div>

      <div class="min-w-0">
        <p
          v-if="props.eyebrow"
          class="
            text-muted-foreground
            text-[11px] font-medium uppercase tracking-[0.14em]
          "
        >
          {{ props.eyebrow }}
        </p>

        <h1 class="mt-0.5 text-xl font-semibold tracking-tight text-foreground">
          {{ props.title }}
        </h1>

        <p
          v-if="props.description"
          class="text-muted-foreground mt-1 max-w-2xl text-sm leading-relaxed"
        >
          {{ props.description }}
        </p>
      </div>
    </div>

    <div
      v-if="$slots.actions"
      class="flex shrink-0 flex-wrap items-center gap-2"
    >
      <slot name="actions" />
    </div>
  </header>
</template>
