<script setup lang="ts">
import { Code2, ExternalLink } from '@lucide/vue'
import { Badge } from '@renderer/components/ui/badge'
import { Button } from '@renderer/components/ui/button'
import appIcon from '../../../../../resources/icon.png'

const version = '0.1.0'
</script>

<template>
  <main class="flex min-h-full items-center justify-center p-8">
    <section
      class="flex w-full max-w-md flex-col items-center gap-5 text-center"
    >
      <img :src="appIcon" alt="Kirika Studio" class="size-28 object-contain">
      <div class="flex flex-col gap-2">
        <h1 class="text-2xl font-semibold">Kirika Studio</h1>
        <p class="text-sm text-muted-foreground">
          面向角色、世界书的创作工作台。
        </p>
      </div>
      <Badge variant="outline">版本 {{ version }}</Badge>
      <div class="grid w-full grid-cols-2 gap-3">
        <div class="rounded-xl border p-3">
          <p class="text-xs text-muted-foreground">Electron</p>
          <p class="mt-1 text-sm font-medium">43.4.1</p>
        </div>
        <div class="rounded-xl border p-3">
          <p class="text-xs text-muted-foreground">License</p>
          <p class="mt-1 text-sm font-medium">MIT</p>
        </div>
      </div>
      <div class="flex gap-2">
        <Button as-child variant="outline">
          <a
            href="https://github.com/MTPGroup/kirika-js"
            target="_blank"
            rel="noreferrer"
          >
            <Code2 data-icon="inline-start" />项目仓库
          </a>
        </Button>
        <Button as-child variant="ghost">
          <a
            href="https://github.com/MTPGroup/kirika-js/issues"
            target="_blank"
            rel="noreferrer"
          >
            <ExternalLink data-icon="inline-start" />反馈问题
          </a>
        </Button>
      </div>
      <p class="text-xs text-muted-foreground">© 2026 Kirika Studio</p>
    </section>
  </main>
</template>
