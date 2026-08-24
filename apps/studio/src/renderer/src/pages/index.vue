<script setup lang="ts">
import {
  BookOpen,
  Bot,
  CircleCheck,
  FolderOpen,
  MessageCircle,
  Plus,
  Settings2,
  Sparkles,
  User,
} from '@lucide/vue'
import StatCard from '@renderer/components/layout/StatCard.vue'
import { Badge } from '@renderer/components/ui/badge'
import { Button } from '@renderer/components/ui/button'
import { initials, timeAgo } from '@renderer/lib/format'
import { useStudioStore } from '@renderer/stores/studio'
import type { Component } from 'vue'
import { computed } from 'vue'

const studio = useStudioStore()
const demoCharacters = computed(() => studio.characters)
const demoLorebooks = computed(() => studio.lorebooks)
const demoConversations = computed(() => studio.conversations)
const workspaceState = computed(() => ({
  workspaceName: studio.workspace
    ? studio.workspace.workspaceDir.split(/[\\/]/).pop() || 'Kirika Studio'
    : '未打开工作区',
  schemaVersion: studio.workspace?.schemaVersion ?? 0,
}))
const recentActivity: readonly {
  id: string
  kind: string
  title: string
  time: string
}[] = []

const activityIcon: Record<string, unknown> = {
  character: User,
  conversation: MessageCircle,
  lorebook: BookOpen,
  generation: Sparkles,
}

type StatTone = 'default' | 'primary' | 'success' | 'muted'

const stats = computed(
  (): {
    label: string
    value: number
    hint: string
    icon: Component
    tone: StatTone
  }[] => [
    {
      label: '角色',
      value: demoCharacters.value.length,
      hint: `${demoCharacters.value.filter((item) => item.hasDraft).length} 个草稿`,
      icon: User,
      tone: 'primary',
    },
    {
      label: '世界书',
      value: demoLorebooks.value.length,
      hint: `共 ${demoLorebooks.value.reduce((sum, item) => sum + item.entryCount, 0)} 条目`,
      icon: BookOpen,
      tone: 'default',
    },
    {
      label: '会话',
      value: demoConversations.value.length,
      hint: `${demoConversations.value.filter((item) => item.status === 'active').length} 个进行中`,
      icon: MessageCircle,
      tone: 'success',
    },
    {
      label: '模型',
      value: studio.providers.length,
      hint: `${studio.providers.filter((item) => item.enabled).length} 个已启用`,
      icon: Bot,
      tone: 'muted',
    },
  ],
)

const quickSteps = [
  { title: '配置你的第一个模型', done: true, desc: '连接 OpenAI 兼容接口' },
  { title: '导入或创建角色', done: true, desc: '开始塑造你的世界角色' },
  { title: '编写世界书设定', done: false, desc: '为角色补充背景与规则' },
  { title: '开启一段对话', done: false, desc: '测试并预览生成效果' },
]
</script>

<template>
  <div class="mx-auto w-full max-w-280 px-6 py-7 lg:px-8">
    <!-- Hero -->
    <section
      class="hero-glow relative overflow-hidden rounded-3xl border border-border p-6 sm:p-8"
    >
      <div
        class="pointer-events-none absolute -top-24 -right-16 size-64 rounded-full bg-primary/10 blur-3xl"
      />
      <div
        class="pointer-events-none absolute -bottom-32 left-1/4 size-72 rounded-full bg-chart-3/10 blur-3xl"
      />

      <div
        class="relative flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between"
      >
        <div class="max-w-xl">
          <div class="flex items-center gap-2">
            <span
              class="text-muted-foreground inline-flex items-center gap-1.5 rounded-full border border-border bg-background/70 px-2.5 py-1 text-xs font-medium"
            >
              <FolderOpen :size="13" />
              {{ workspaceState.workspaceName }}
            </span>
            <span class="text-muted-foreground text-xs"
              >schema v{{ workspaceState.schemaVersion }}</span
            >
          </div>

          <h1
            class="text-foreground mt-4 text-2xl font-semibold tracking-tight sm:text-3xl"
          >
            欢迎回到<span class="text-muted-foreground">
              {{ workspaceState.workspaceName }}</span
            >
          </h1>
          <p
            class="text-muted-foreground mt-2 max-w-lg text-sm leading-relaxed"
          >
            在这里组织角色、世界书与对话。一切都保存在本地，随时离线创作。
          </p>

          <div class="mt-6 flex flex-wrap items-center gap-2">
            <Button>
              <Plus :size="15" />
              新建角色
            </Button>
            <Button variant="outline">
              <MessageCircle :size="15" />
              继续对话
            </Button>
            <Button variant="ghost">
              <Settings2 :size="15" />
              配置模型
            </Button>
          </div>
        </div>

        <div class="hidden shrink-0 lg:block">
          <div class="flex items-center gap-3">
            <div class="text-right">
              <p class="text-muted-foreground text-xs font-medium">今日生成</p>
              <p
                class="text-foreground text-3xl font-semibold tabular-nums tracking-tight"
              >
                1.2k
              </p>
              <p class="text-muted-foreground mt-0.5 text-xs">tokens</p>
            </div>
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
        :tone="stat.tone"
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
              <span class="transition-transform group-hover:translate-x-0.5"
                >→</span
              >
            </span>
          </div>

          <ul class="mt-3 divide-y divide-border/70">
            <li
              v-for="chr in demoCharacters.slice(0, 4)"
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
                  {{ chr.alias }}
                  · {{ timeAgo(chr.updatedAt) }}
                </p>
              </div>
              <Badge v-if="chr.hasDraft" variant="soft" class="shrink-0"
                >草稿</Badge
              >
            </li>
          </ul>
        </div>
      </RouterLink>

      <div class="space-y-5 lg:col-span-2">
        <!-- Quick start -->
        <div class="rounded-2xl border border-border bg-card p-5">
          <h2 class="text-foreground text-sm font-semibold">快速开始</h2>
          <ul class="mt-3 space-y-3">
            <li
              v-for="step in quickSteps"
              :key="step.title"
              class="flex items-start gap-3"
            >
              <div
                class="mt-0.5 flex size-5 shrink-0 items-center justify-center"
              >
                <CircleCheck v-if="step.done" :size="16" class="text-success" />
                <div
                  v-else
                  class="size-4 rounded-full border-2 border-border"
                />
              </div>
              <div class="min-w-0">
                <p
                  :class="step.done ? 'text-muted-foreground' : 'text-foreground'"
                  class="text-sm font-medium"
                >
                  {{ step.title }}
                </p>
                <p class="text-muted-foreground text-xs">{{ step.desc }}</p>
              </div>
            </li>
          </ul>
        </div>

        <!-- Recent activity -->
        <div class="rounded-2xl border border-border bg-card p-5">
          <h2 class="text-foreground text-sm font-semibold">最近动态</h2>
          <ul class="mt-3 space-y-3.5">
            <li
              v-for="item in recentActivity"
              :key="item.id"
              class="flex items-center gap-3"
            >
              <div
                class="flex size-8 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground"
              >
                <component :is="activityIcon[item.kind]" :size="15" />
              </div>
              <div class="min-w-0 flex-1">
                <p class="text-foreground truncate text-sm">{{ item.title }}</p>
                <p class="text-muted-foreground text-xs">
                  {{ timeAgo(item.time) }}
                </p>
              </div>
            </li>
          </ul>
        </div>
      </div>
    </section>
  </div>
</template>
