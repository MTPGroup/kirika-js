<script setup lang="ts">
import {
  Check,
  Clock,
  Download,
  MoreVertical,
  Pencil,
  Plus,
  Search,
  Trash2,
  Upload,
  User,
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
import { initials, timeAgo } from '@renderer/lib/format'
import { api } from '@renderer/services/api'
import { useStudioStore } from '@renderer/stores/studio'
import { computed, onMounted, ref } from 'vue'

const studio = useStudioStore()

type Filter = 'all' | 'published' | 'draft'

const query = ref('')
const filter = ref<Filter>('all')

const characters = computed(() => studio.characters)
onMounted(() => studio.execute(studio.refreshResources))

const filtered = computed(() => {
  const q = query.value.trim().toLowerCase()
  return characters.value.filter((chr) => {
    const matchesQuery =
      !q ||
      chr.name.toLowerCase().includes(q) ||
      (chr.alias ?? '').toLowerCase().includes(q)
    switch (filter.value) {
      case 'published':
        return matchesQuery && !chr.hasDraft && chr.currentRevisionId != null
      case 'draft':
        return matchesQuery && chr.hasDraft
      default:
        return matchesQuery
    }
  })
})

const filterOptions = computed(() => [
  { value: 'all' as Filter, label: '全部', count: characters.value.length },
  {
    value: 'published' as Filter,
    label: '已发布',
    count: characters.value.filter(
      (c) => !c.hasDraft && c.currentRevisionId != null,
    ).length,
  },
  {
    value: 'draft' as Filter,
    label: '草稿',
    count: characters.value.filter((c) => c.hasDraft).length,
  },
])

async function createCharacter() {
  const name = window.prompt('角色名称')?.trim()
  if (!name) return
  await studio.execute(async () => {
    await api.createCharacter({ name })
    await studio.refreshResources()
  })
}

async function importCharacterCard() {
  const selected = await studio.execute(() =>
    api.selectFile({
      title: '导入角色卡',
      filters: [{ name: 'Character Card JSON', extensions: ['json'] }],
    }),
  )
  const filePath = selected?.path
  if (!filePath) return
  await studio.execute(async () => {
    await api.importCharacterCard({
      filePath,
      formatHint: 'json',
    })
    await studio.refreshResources()
  })
}

async function exportCharacterCard(characterId: string) {
  const character = await studio.execute(() =>
    api.getCharacter({ characterId }),
  )
  if (!character) return
  const revisionId = character.currentRevisionId ?? character.draftRevisionId
  if (!revisionId) return
  const name =
    character.revisions.find((item) => item.id === revisionId)?.name ??
    'character'
  const selected = await studio.execute(() =>
    api.saveFile({
      title: '导出角色卡',
      defaultName: `${name}.json`,
      filters: [{ name: 'Character Card JSON', extensions: ['json'] }],
    }),
  )
  const destinationPath = selected?.path
  if (!destinationPath) return
  await studio.execute(() =>
    api.exportCharacterCard({
      characterId,
      revisionId,
      format: 'json',
      destinationPath,
    }),
  )
}

async function deleteCharacter(characterId: string) {
  if (!window.confirm('确定删除这个角色吗？')) return
  await studio.execute(async () => {
    await api.deleteCharacter({ characterId })
    await studio.refreshResources()
  })
}
</script>

<template>
  <div class="mx-auto w-full max-w-280 px-6 py-7 lg:px-8">
    <PageHeader
      eyebrow="Characters"
      title="角色"
      description="管理你的角色卡、草稿版本与已发布内容。"
    >
      <template #actions>
        <Button variant="outline" @click="importCharacterCard">
          <Upload :size="15" />
          导入角色卡
        </Button>
        <Button @click="createCharacter">
          <Plus :size="15" />
          新建角色
        </Button>
      </template>
    </PageHeader>

    <!-- Toolbar -->
    <div
      class="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"
    >
      <div class="relative w-full sm:max-w-xs">
        <Search
          class="text-muted-foreground absolute top-1/2 left-3 -translate-y-1/2"
          :size="15"
        />
        <Input v-model="query" placeholder="搜索角色名或别名…" class="pl-9" />
      </div>

      <DropdownMenu>
        <DropdownMenuTrigger as-child>
          <Button variant="outline" size="sm" class="justify-start gap-2">
            筛选
            <span class="text-muted-foreground"
              >{{ filterOptions.find((o) => o.value === filter)?.label }}</span
            >
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" class="w-44">
          <DropdownMenuItem
            v-for="opt in filterOptions"
            :key="opt.value"
            class="justify-between"
            @select="filter = opt.value"
          >
            <span>{{ opt.label }}</span>
            <span class="text-muted-foreground text-xs">{{ opt.count }}</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>

    <!-- Content -->
    <div
      v-if="filtered.length"
      class="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3"
    >
      <div
        v-for="chr in filtered"
        :key="chr.id"
        class="group relative rounded-2xl border border-border bg-card p-4 transition-colors hover:border-border/80"
      >
        <div class="flex items-start gap-3">
          <div
            class="flex size-11 shrink-0 items-center justify-center rounded-full bg-linear-to-br from-muted to-muted/60 text-sm font-semibold text-muted-foreground"
          >
            {{ initials(chr.name) }}
          </div>

          <div class="min-w-0 flex-1">
            <p class="text-foreground truncate text-sm font-medium">
              {{ chr.name }}
            </p>
            <p class="text-muted-foreground mt-0.5 text-xs">
              {{ chr.alias }}
              · {{ timeAgo(chr.updatedAt) }}
            </p>
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
              <DropdownMenuItem><Pencil :size="14" />编辑草稿</DropdownMenuItem>
              <DropdownMenuItem @select="exportCharacterCard(chr.id)"
                ><Download :size="14" />导出卡片</DropdownMenuItem
              >
              <DropdownMenuSeparator />
              <DropdownMenuItem
                variant="destructive"
                @select="deleteCharacter(chr.id)"
                ><Trash2 :size="14" />删除</DropdownMenuItem
              >
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <div class="mt-4 flex flex-wrap items-center gap-2">
          <Badge v-if="chr.hasDraft" variant="soft">
            <Clock :size="12" />
            草稿 v{{ chr.revisionCount }}
          </Badge>
          <Badge v-else-if="chr.currentRevisionId" variant="success">
            <Check :size="12" />
            已发布
          </Badge>
          <Badge v-else variant="secondary">未发布</Badge>
        </div>
      </div>
    </div>

    <div v-else class="mt-6">
      <EmptyState
        :icon="User"
        title="没有找到角色"
        description="试试调整筛选条件，或新建一个角色开始创作。"
      >
        <Button @click="createCharacter">
          <Plus :size="15" />
          新建角色
        </Button>
      </EmptyState>
    </div>
  </div>
</template>
