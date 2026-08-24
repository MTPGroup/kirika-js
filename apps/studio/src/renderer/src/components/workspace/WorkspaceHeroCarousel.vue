<script setup lang="ts">
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from '@renderer/components/ui/carousel'
import Autoplay from 'embla-carousel-autoplay'

interface HeroSlide {
  src: string
  alt: string
}

const modules = import.meta.glob<string>(
  '../../assets/heros/*.{png,jpg,jpeg,webp,avif}',
  {
    eager: true,
    query: '?url',
    import: 'default',
  },
)

const slides: HeroSlide[] = Object.entries(modules)
  .sort(([left], [right]) =>
    left.localeCompare(right, undefined, {
      numeric: true,
      sensitivity: 'base',
    }),
  )
  .map(([_path, src], index) => ({
    src,
    alt: `Kirika Studio 展示图 ${index + 1}`,
  }))

const autoplay = Autoplay({
  delay: 5000,
  stopOnInteraction: false,
  stopOnMouseEnter: true,
})
</script>

<template>
  <Carousel
    v-if="slides.length"
    class="group relative w-full"
    :opts="{
      loop: true,
      align: 'start',
    }"
    :plugins="[autoplay]"
  >
    <CarouselContent>
      <CarouselItem v-for="slide in slides" :key="slide.src">
        <div class="aspect-video overflow-hidden rounded-xl bg-muted">
          <img
            :src="slide.src"
            :alt="slide.alt"
            class="size-full object-cover"
            draggable="false"
          >
        </div>
      </CarouselItem>
    </CarouselContent>

    <CarouselPrevious
      v-if="slides.length > 1"
      class="left-3 opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100"
    />

    <CarouselNext
      v-if="slides.length > 1"
      class="right-3 opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100"
    />
  </Carousel>
</template>
