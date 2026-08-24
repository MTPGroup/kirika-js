<script setup lang="ts">
import {
  BookMarked,
  Check,
  Clock,
  Download,
  Loader2,
  MoreVertical,
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@renderer/components/ui/dialog'
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
import {
  api,
  type CharacterDto,
  type LorebookDto,
  toIpcError,
} from '@renderer/services/api'
import { useStudioStore } from '@renderer/stores/studio'
import { computed, onMounted, ref } from 'vue'

const studio = useStudioStore()

type Filter = 'all' | 'published' | 'draft'

const query = ref('')
const filter = ref<Filter>('all')
const lorebookDialogOpen = ref(false)
const lorebookLoading = ref(false)
const lorebookSaving = ref(false)
const lorebookError = ref('')
const editingCharacter = ref<CharacterDto | null>(null)
const availableLorebooks = ref<LorebookDto[]>([])
const selectedLorebookRevisions = ref<string[]>([])

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

async function editCharacterLorebooks(characterId: string) {
  lorebookDialogOpen.value = true
  lorebookLoading.value = true
  lorebookError.value = ''
  try {
    const [character, ...books] = await Promise.all([
      api.getCharacter({ characterId }),
      ...studio.lorebooks.map((item) =>
        api.getLorebook({ lorebookId: item.id }),
      ),
    ])
    if (!character) throw new Error('角色不存在')
    editingCharacter.value = character
    availableLorebooks.value = books.filter(
      (item): item is LorebookDto =>
        item !== null && item.currentRevisionId !== null,
    )
    const draft = character.revisions.find((item) => item.isDraft)
    selectedLorebookRevisions.value = (draft?.lorebooks ?? []).map(
      (item) => item.lorebookRevisionId,
    )
  } catch (error) {
    lorebookError.value = toIpcError(error).message
  } finally {
    lorebookLoading.value = false
  }
}

function toggleLorebookRevision(revisionId: string) {
  selectedLorebookRevisions.value = selectedLorebookRevisions.value.includes(
    revisionId,
  )
    ? selectedLorebookRevisions.value.filter((value) => value !== revisionId)
    : [...selectedLorebookRevisions.value, revisionId]
}

async function saveCharacterLorebooks() {
  const character = editingCharacter.value
  if (!character) return
  lorebookSaving.value = true
  lorebookError.value = ''
  try {
    let target = character
    if (!target.draftRevisionId) {
      target = await api.createCharacterDraft({ characterId: target.id })
    }
    await api.replaceCharacterLorebooks({
      characterId: target.id,
      lorebooks: selectedLorebookRevisions.value.map(
        (lorebookRevisionId, ordinal) => ({
          lorebookRevisionId,
          ordinal,
          enabled: true,
        }),
      ),
    })
    lorebookDialogOpen.value = false
    await studio.refreshResources()
  } catch (error) {
    lorebookError.value = toIpcError(error).message
  } finally {
    lorebookSaving.value = false
  }
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
              <DropdownMenuItem @select="editCharacterLorebooks(chr.id)">
                <BookMarked :size="14" />管理世界书
              </DropdownMenuItem>
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
    <Dialog v-model:open="lorebookDialogOpen">
      <DialogContent class="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>管理角色世界书</DialogTitle>
          <DialogDescription>
            为角色草稿绑定世界书当前已发布版本。发布新世界书版本后可在这里重新选择。
          </DialogDescription>
        </DialogHeader>
        <div v-if="lorebookLoading" class="flex justify-center py-10">
          <Loader2 class="animate-spin" />
        </div>
        <div v-else class="max-h-96 space-y-2 overflow-y-auto">
          <button
            v-for="book in availableLorebooks"
            :key="book.id"
            type="button"
            class="flex w-full items-center gap-3 rounded-xl border p-3 text-left hover:bg-muted"
            :class="selectedLorebookRevisions.includes(book.currentRevisionId ?? '') ? 'border-primary bg-primary/5' : ''"
            @click="book.currentRevisionId && toggleLorebookRevision(book.currentRevisionId)"
          >
            <BookMarked :size="18" />
            <span class="min-w-0 flex-1">
              <span class="block truncate text-sm font-medium"
                >{{ book.name }}</span
              >
              <span class="block text-xs text-muted-foreground">
                v{{ book.revisions.find((revision) => revision.id === book.currentRevisionId)?.revisionNumber }}
                · {{ book.description || '暂无描述' }}
              </span>
            </span>
            <Check
              v-if="selectedLorebookRevisions.includes(book.currentRevisionId ?? '')"
              :size="16"
              class="text-primary"
            />
          </button>
          <p
            v-if="!availableLorebooks.length"
            class="py-8 text-center text-sm text-muted-foreground"
          >
            暂无已发布世界书，请先在世界书页面发布一个版本。
          </p>
        </div>
        <p
          v-if="lorebookError"
          class="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive"
        >
          {{ lorebookError }}
        </p>
        <DialogFooter>
          <Button variant="outline" @click="lorebookDialogOpen = false"
            >取消</Button
          >
          <Button
            :disabled="lorebookLoading || lorebookSaving"
            @click="saveCharacterLorebooks"
          >
            <Loader2 v-if="lorebookSaving" class="animate-spin" :size="15" />
            保存绑定
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  </div>
</template>
