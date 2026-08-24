<script setup lang="ts">
const props = defineProps<{
  modelValue: boolean
  label?: string
  description?: string
  disabled?: boolean
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void
}>()

function toggle() {
  if (props.disabled) return
  emit('update:modelValue', !props.modelValue)
}
</script>

<template>
  <div class="flex items-center justify-between gap-3">
    <div class="min-w-0">
      <p class="text-sm font-medium">{{ label }}</p>
      <p v-if="description" class="text-muted-foreground mt-0.5 text-xs">{{ description }}</p>
    </div>
    <button
      type="button"
      role="switch"
      :aria-checked="modelValue"
      :disabled="disabled"
      :class="modelValue ? 'bg-primary' : 'bg-muted'"
      class="ring-offset-background focus-visible:ring-ring relative h-5.5 w-10 shrink-0 rounded-full transition-colors outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50"
      @click="toggle"
    >
      <span
        :class="modelValue ? 'translate-x-5' : 'translate-x-0.5'"
        class="absolute top-0.5 left-0 size-4 rounded-full bg-background shadow-sm transition-transform"
      />
    </button>
  </div>
</template>
