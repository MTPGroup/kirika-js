<script setup lang="ts">
import {
  BookMarked,
  BookOpen,
  Check,
  Clock,
  Globe,
  Lock,
  MoreVertical,
  Pencil,
  Plus,
  Search,
  Trash2,
  Upload,
} from '@lucide/vue'
import EmptyState from '@renderer/components/layout/EmptyState.vue'
import PageHeader from '@renderer/components/layout/PageHeader.vue'
import { Badge } from '@renderer/components/ui/badge'
import { Button } from '@renderer/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@renderer/components/ui/dropdown-menu'
import { Input } from '@renderer/components/ui/input'
import { demoLorebooks } from '@renderer/lib/demo'
import { timeAgo } from '@renderer/lib/format'
import type { LorebookSummaryDto } from '@renderer/services/api'
import { computed, ref } from 'vue'

const query = ref('')
const books = ref<LorebookSummaryDto[]>([...demoLorebooks])

const filtered = computed(() => {
  const q = query.value.trim().toLowerCase()
  if (!q) return books.value
  return books.value.filter(
    (b) =>
      b.name.toLowerCase().includes(q) ||
      b.description.toLowerCase().includes(q),
  )
})

const visibilityMeta: Record<
  LorebookSummaryDto['visibility'],
  { label: string; icon: unknown }
> = {
  private: { label: '仅自己', icon: Lock },
  unlisted: { label: '不公开', icon: Globe },
  public: { label: '公开', icon: Globe },
}
</script>

<template>
  <div class="mx-auto w-full max-w-280 px-6 py-7 lg:px-8">
    <PageHeader
      eyebrow="Lorebooks"
      title="世界书"
      description="集中维护可被角色引用的设定、关键词与注入规则。"
    >
      <template #actions>
        <Button>
          <Plus :size="15" />
          新建世界书
        </Button>
      </template>
    </PageHeader>

    <div
      class="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"
    >
      <div class="relative w-full sm:max-w-xs">
        <Search
          class="text-muted-foreground absolute top-1/2 left-3 -translate-y-1/2"
          :size="15"
        />
        <Input v-model="query" placeholder="搜索世界书…" class="pl-9" />
      </div>
      <span class="text-muted-foreground text-xs"
        >{{ filtered.length }}
        本世界书</span
      >
    </div>

    <div v-if="filtered.length" class="mt-5 space-y-3">
      <div
        v-for="book in filtered"
        :key="book.id"
        class="group flex items-start gap-4 rounded-2xl border border-border bg-card p-4 transition-colors hover:border-border/80"
      >
        <div
          class="flex size-11 shrink-0 items-center justify-center rounded-xl bg-muted text-muted-foreground"
        >
          <BookMarked :size="20" :stroke-width="1.75" />
        </div>

        <div class="min-w-0 flex-1">
          <div class="flex flex-wrap items-center gap-2">
            <h3 class="text-foreground truncate text-sm font-semibold">
              {{ book.name }}
            </h3>
            <Badge variant="outline" class="gap-1">
              <component
                :is="visibilityMeta[book.visibility].icon"
                :size="12"
              />
              {{ visibilityMeta[book.visibility].label }}
            </Badge>
            <Badge v-if="book.draftRevisionId" variant="soft">
              <Clock :size="12" />
              草稿
            </Badge>
            <Badge v-else variant="success">
              <Check :size="12" />
              已发布
            </Badge>
          </div>
          <p class="text-muted-foreground mt-1 line-clamp-1 text-sm">
            {{ book.description }}
          </p>
          <div
            class="text-muted-foreground mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs"
          >
            <span>{{ book.entryCount }} 条目</span>
            <span>{{ book.revisionCount }} 个版本</span>
            <span>{{ timeAgo(book.updatedAt) }}更新</span>
          </div>
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger as-child>
            <Button
              variant="ghost"
              size="icon-sm"
              class="text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100 focus:opacity-100"
            >
              <MoreVertical :size="16" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" class="w-40">
            <DropdownMenuLabel>操作</DropdownMenuLabel>
            <DropdownMenuItem><Pencil :size="14" />编辑条目</DropdownMenuItem>
            <DropdownMenuItem><Upload :size="14" />导出</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem variant="destructive"
              ><Trash2 :size="14" />删除</DropdownMenuItem
            >
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>

    <div v-else class="mt-6">
      <EmptyState
        :icon="BookOpen"
        title="没有找到世界书"
        description="调整搜索关键词，或新建一本世界书来整理你的设定。"
      >
        <Button>
          <Plus :size="15" />
          新建世界书
        </Button>
      </EmptyState>
    </div>
  </div>
</template>
