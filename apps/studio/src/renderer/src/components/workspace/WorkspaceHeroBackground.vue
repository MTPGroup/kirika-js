<script setup lang="ts">
import { usePreferredReducedMotion } from '@vueuse/core'
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'

const imageModules = import.meta.glob<string>(
  '../../assets/heros/*.{png,jpg,jpeg,webp,avif}',
  {
    eager: true,
    query: '?url',
    import: 'default',
  },
)

const images = Object.entries(imageModules)
  .sort(([left], [right]) =>
    left.localeCompare(right, undefined, {
      numeric: true,
      sensitivity: 'base',
    }),
  )
  .map(([, src]) => src)

const activeIndex = ref(0)
const reducedMotion = usePreferredReducedMotion()

const activeImage = computed(() => images[activeIndex.value])
let timer: ReturnType<typeof setInterval> | undefined

function startAutoplay() {
  if (images.length <= 1 || reducedMotion.value === 'reduce') return

  timer = setInterval(() => {
    activeIndex.value = (activeIndex.value + 1) % images.length
  }, 6000)
}

function stopAutoplay() {
  if (timer !== undefined) {
    clearInterval(timer)
    timer = undefined
  }
}

onMounted(startAutoplay)
onBeforeUnmount(stopAutoplay)
</script>

<template>
  <div class="pointer-events-none absolute inset-0" aria-hidden="true">
    <Transition name="hero-fade">
      <img
        v-if="activeImage"
        :key="activeImage"
        :src="activeImage"
        alt=""
        class="absolute inset-0 size-full object-cover"
        draggable="false"
      >
    </Transition>
  </div>
</template>

<style scoped>
.hero-fade-enter-active,
.hero-fade-leave-active {
  transition: opacity 900ms ease;
}

.hero-fade-enter-from,
.hero-fade-leave-to {
  opacity: 0;
}

.hero-fade-leave-active {
  position: absolute;
  inset: 0;
}
</style>
