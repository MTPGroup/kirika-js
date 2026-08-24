<script setup lang="ts">
import type { HTMLAttributes } from 'vue'
import type { BadgeVariants } from '.'
import { cn } from '@renderer/lib/utils'
import { badgeVariants } from '.'

const props = withDefaults(
  defineProps<{
    variant?: BadgeVariants['variant']
    class?: HTMLAttributes['class']
  }>(),
  {
    variant: 'default',
  },
)
</script>

<template>
  <span
    data-slot="badge"
    :class="cn(badgeVariants({ variant: props.variant }), props.class)"
  >
    <slot />
  </span>
</template>
