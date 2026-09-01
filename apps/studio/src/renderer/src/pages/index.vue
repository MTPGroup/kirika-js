<script setup lang="ts">
import { BookOpen, Bot, FolderOpen, MessageCircle, Plus, Settings2, User } from '@lucide/vue'
import StatCard from '@renderer/components/layout/StatCard.vue'
import { Badge } from '@renderer/components/ui/badge'
import { Button } from '@renderer/components/ui/button'
import WorkspaceHeroBackground from '@renderer/components/workspace/WorkspaceHeroBackground.vue'
import WorkspaceOnboarding from '@renderer/components/workspace/WorkspaceOnboarding.vue'
import { initials, timeAgo } from '@renderer/lib/format'
import { useStudioStore } from '@renderer/stores/studio'
import type { Component } from 'vue'
import { computed } from 'vue'

const studio = useStudioStore()
const characters = computed(() => studio.characters)
const lorebooks = computed(() => studio.lorebooks)
const conversations = computed(() => studio.conversations)
const workspaceState = computed(() => ({
  workspaceDir: studio.workspace?.rootDir.split('/').at(-1) ?? '未打开工作区',
  workspaceName: studio.workspace?.name ?? '未打开工作区',
  schemaVersion: studio.workspace?.schemaVersion ?? 0,
}))

// const recentActivity: readonly {
//   id: string
//   kind: string
//   title: string
//   time: string
// }[] = []
//
// const activityIcon: Record<string, unknown> = {
//   character: User,
//   conversation: MessageCircle,
//   lorebook: BookOpen,
//   generation: Sparkles,
// }

type StatAccent = 'default' | 'primary' | 'success'

const stats = computed(
  (): {
    label: string
    value: number
    hint: string
    icon: Component
    accent: StatAccent
  }[] => [
    {
      label: '角色',
      value: characters.value.length,
      hint: `${characters.value.filter((item) => item.hasDraft).length} 个草稿`,
      icon: User,
      accent: 'default',
    },
    {
      label: '世界书',
      value: lorebooks.value.length,
      hint: `共 ${lorebooks.value.reduce((sum, item) => sum + item.entryCount, 0)} 条目`,
      icon: BookOpen,
      accent: 'default',
    },
    {
      label: '会话',
      value: conversations.value.length,
      hint: `${conversations.value.filter((item) => item.status === 'active').length} 个进行中`,
      icon: MessageCircle,
      accent: 'default',
    },
    {
      label: '模型',
      value: studio.providers.length,
      hint: `${studio.providers.filter((item) => item.enabled).length} 个已启用`,
      icon: Bot,
      accent: 'default',
    },
  ],
)
</script>

<template>
  <div class="mx-auto w-full max-w-280 px-6 py-7 lg:px-8">
    <!-- Hero -->
    <section class="relative isolate min-h-90 overflow-hidden rounded-3xl border bg-card">
      <WorkspaceHeroBackground />

      <div
        class="pointer-events-none absolute inset-0 bg-linear-to-r from-background from-5% via-background/85 via-48% to-background/5 to-78%"
        aria-hidden="true"
      />

      <div
        class="pointer-events-none absolute inset-0 bg-linear-to-t from-background/45 via-transparent to-background/10"
        aria-hidden="true"
      />

      <div class="relative flex min-h-90 items-center px-6 py-9 sm:px-10 lg:px-14">
        <div class="flex w-full max-w-2xl flex-col gap-6">
          <div class="flex flex-col gap-4">
            <div class="flex flex-wrap items-center gap-2">
              <Badge variant="secondary">
                <FolderOpen />
                {{ workspaceState.workspaceName }}
              </Badge>

              <Badge variant="outline" class="bg-background/40 font-normal">
                schema v{{ workspaceState.schemaVersion }}
              </Badge>
            </div>

            <div class="flex flex-col gap-2.5">
              <h1 class="max-w-xl text-2xl font-semibold tracking-tight text-balance sm:text-3xl">
                欢迎回到
                <span class="text-primary">{{ workspaceState.workspaceName }}</span>
              </h1>

              <p class="max-w-xl text-sm leading-6 text-pretty text-muted-foreground sm:text-base">
                在这里组织角色、世界书与对话。一切都保存在本地，随时离线创作。
              </p>
            </div>
          </div>

          <div class="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
            <Button as-child size="lg">
              <RouterLink to="/characters">
                <Plus data-icon="inline-start" />
                新建角色
              </RouterLink>
            </Button>

            <Button as-child size="lg" variant="secondary">
              <RouterLink to="/tests">
                <MessageCircle data-icon="inline-start" />
                开始测试
              </RouterLink>
            </Button>

            <Button as-child size="lg" variant="ghost">
              <RouterLink to="/models">
                <Settings2 data-icon="inline-start" />
                配置模型
              </RouterLink>
            </Button>
          </div>
        </div>
      </div>
    </section>

    <!-- Stats -->
    <section class="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
      <StatCard
        v-for="stat in stats"
        :key="stat.label"
        :label="stat.label"
        :value="stat.value"
        :hint="stat.hint"
        :icon="stat.icon"
        :accent="stat.accent"
      />
    </section>

    <!-- Content -->
    <section class="mt-6 grid grid-cols-1 gap-5 lg:grid-cols-5">
      <!-- Recent characters -->
      <RouterLink to="/characters" class="group lg:col-span-3">
        <div
          class="h-full rounded-2xl border border-border bg-card p-5 transition-colors hover:border-border/80"
        >
          <div class="flex items-center justify-between">
            <h2 class="text-foreground text-sm font-semibold">最近角色</h2>
            <span class="text-muted-foreground flex items-center gap-1 text-xs">
              查看全部
              <span class="transition-transform group-hover:translate-x-0.5"> → </span>
            </span>
          </div>

          <ul class="mt-3 divide-y divide-border/70">
            <li
              v-for="chr in characters.slice(0, 4)"
              :key="chr.id"
              class="flex items-center gap-3 py-3"
            >
              <div
                class="flex size-9 shrink-0 items-center justify-center rounded-full bg-muted text-sm font-semibold text-muted-foreground"
              >
                {{ initials(chr.name) }}
              </div>
              <div class="min-w-0 flex-1">
                <p class="text-foreground truncate text-sm font-medium">
                  {{ chr.name }}
                </p>
                <p class="text-muted-foreground text-xs">
                  {{ chr.alias }}· {{ timeAgo(chr.updatedAt) }}
                </p>
              </div>
              <Badge v-if="chr.hasDraft" variant="soft" class="shrink-0">草稿</Badge>
            </li>
          </ul>
        </div>
      </RouterLink>

      <div class="flex flex-col gap-5 lg:col-span-2">
        <WorkspaceOnboarding />

        <!-- Recent activity -->
        <!-- <div class="rounded-2xl border border-border bg-card p-5"> -->
        <!--   <h2 class="text-foreground text-sm font-semibold">最近动态</h2> -->
        <!--   <ul class="mt-3 space-y-3.5"> -->
        <!--     <li -->
        <!--       v-for="item in recentActivity" -->
        <!--       :key="item.id" -->
        <!--       class="flex items-center gap-3" -->
        <!--     > -->
        <!--       <div -->
        <!--         class="flex size-8 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground" -->
        <!--       > -->
        <!--         <component :is="activityIcon[item.kind]" :size="15" /> -->
        <!--       </div> -->
        <!--       <div class="min-w-0 flex-1"> -->
        <!--         <p class="text-foreground truncate text-sm">{{ item.title }}</p> -->
        <!--         <p class="text-muted-foreground text-xs"> -->
        <!--           {{ timeAgo(item.time) }} -->
        <!--         </p> -->
        <!--       </div> -->
        <!--     </li> -->
        <!--   </ul> -->
        <!-- </div> -->
      </div>
    </section>
  </div>
</template>
