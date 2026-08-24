<script setup lang="ts">
import { ArrowRight, Circle, CircleCheck } from '@lucide/vue'
import { Badge } from '@renderer/components/ui/badge'
import { Button } from '@renderer/components/ui/button'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@renderer/components/ui/tooltip'

interface Props {
  title: string
  description: string
  done: boolean
  action: string
  to: string
  current?: boolean
  optional?: boolean
  disabled?: boolean
  disabledReason?: string
}

withDefaults(defineProps<Props>(), {
  current: false,
  optional: false,
  disabled: false,
  disabledReason: '',
})
</script>

<template>
  <div
    class="flex items-start gap-3 rounded-lg p-3 transition-colors"
    :class="current ? 'bg-muted/60' : ''"
  >
    <div class="mt-0.5 shrink-0">
      <CircleCheck v-if="done" class="text-success" aria-hidden="true" />
      <Circle v-else class="text-muted-foreground" aria-hidden="true" />
    </div>

    <div class="min-w-0 flex-1">
      <div class="flex flex-wrap items-center gap-2">
        <p
          class="text-sm font-medium"
          :class="done ? 'text-muted-foreground' : 'text-foreground'"
        >
          {{ title }}
        </p>
        <Badge v-if="optional" variant="soft">可选</Badge>
      </div>
      <p class="mt-0.5 text-xs leading-relaxed text-muted-foreground">
        {{ description }}
      </p>
    </div>

    <div v-if="done" class="mt-0.5 flex shrink-0 items-center gap-1">
      <Badge variant="success">已完成</Badge>
      <Button as-child size="xs" variant="ghost">
        <RouterLink :to="to">{{ action }}</RouterLink>
      </Button>
    </div>

    <TooltipProvider v-else-if="disabled">
      <Tooltip>
        <TooltipTrigger as-child>
          <span class="mt-0.5 shrink-0">
            <Button size="sm" variant="outline" disabled>
              {{ action }}
              <ArrowRight data-icon="inline-end" />
            </Button>
          </span>
        </TooltipTrigger>
        <TooltipContent>
          {{ disabledReason }}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>

    <Button
      v-else
      as-child
      size="sm"
      :variant="current ? 'default' : 'outline'"
      class="mt-0.5 shrink-0"
    >
      <RouterLink :to="to">
        {{ action }}
        <ArrowRight data-icon="inline-end" />
      </RouterLink>
    </Button>
  </div>
</template>
