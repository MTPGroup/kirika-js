<script setup lang="ts">
import {
  BookMarked,
  BookOpen,
  Check,
  Clock,
  CopyPlus,
  Loader2,
  MoreVertical,
  Pencil,
  Plus,
  Search,
  Send,
  Trash2,
  X,
} from '@lucide/vue'
import EmptyState from '@renderer/components/layout/EmptyState.vue'
import PageHeader from '@renderer/components/layout/PageHeader.vue'
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@renderer/components/ui/alert-dialog'
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@renderer/components/ui/select'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@renderer/components/ui/sheet'
import { Switch } from '@renderer/components/ui/switch'
import { Textarea } from '@renderer/components/ui/textarea'
import { timeAgo } from '@renderer/lib/format'
import { searchLorebooks } from '@renderer/lib/lorebook-search'
import {
  api,
  type LorebookDto,
  type LorebookEntryDto,
  type LorebookEntryInput,
  type LorebookSummaryDto,
  toIpcError,
} from '@renderer/services/api'
import { useStudioStore } from '@renderer/stores/studio'
import { computed, onMounted, reactive, ref } from 'vue'
import { toast } from 'vue-sonner'

interface EntryDraft {
  id?: string
  title: string
  keys: string
  secondaryKeys: string
  enabled: boolean
  constant: boolean
  content: string
  position: 'before_history' | 'after_history' | 'at_depth'
  insertionDepth: string
  priority: string
  matchMode: 'any' | 'all'
  caseSensitive: boolean
  matchWholeWords: boolean
  probability: string
}

const studio = useStudioStore()
const query = ref('')
const editorOpen = ref(false)
const saving = ref(false)
const publishing = ref(false)
const deleting = ref(false)
const loadingEditor = ref(false)
const pageError = ref('')
const editorError = ref('')
const pendingDelete = ref<LorebookSummaryDto | null>(null)
const book = ref<LorebookDto | null>(null)
const entries = ref<EntryDraft[]>([])
const selectedEntryIndex = ref(0)
const metadata = reactive({
  name: '',
  description: '',
  visibility: 'private' as LorebookDto['visibility'],
  scanDepth: '20',
  tokenBudget: '2048',
})

const books = computed(() => studio.lorebooks)
const draftRevision = computed(() =>
  book.value?.revisions.find((revision) => revision.isDraft),
)
const currentRevision = computed(() =>
  book.value?.revisions.find(
    (revision) => revision.id === book.value?.currentRevisionId,
  ),
)
const selectedEntry = computed(
  () => entries.value[selectedEntryIndex.value] ?? null,
)
const deleteDialogOpen = computed({
  get: () => pendingDelete.value !== null,
  set: (open) => {
    if (!open && !deleting.value) pendingDelete.value = null
  },
})

const filtered = computed(() => searchLorebooks(books.value, query.value))

onMounted(() => studio.execute(studio.refreshLorebooks))

function emptyEntry(): EntryDraft {
  return {
    title: '新条目',
    keys: '',
    secondaryKeys: '',
    enabled: true,
    constant: false,
    content: '',
    position: 'after_history',
    insertionDepth: '0',
    priority: '0',
    matchMode: 'any',
    caseSensitive: false,
    matchWholeWords: false,
    probability: '100',
  }
}

function toEntryDraft(value: LorebookEntryDto): EntryDraft {
  return {
    id: value.id,
    title: value.title,
    keys: value.keys.join(', '),
    secondaryKeys: value.secondaryKeys.join(', '),
    enabled: value.enabled,
    constant: value.constant,
    content: value.content,
    position: value.position,
    insertionDepth: String(value.insertionDepth),
    priority: String(value.priority),
    matchMode: value.matchMode,
    caseSensitive: value.caseSensitive,
    matchWholeWords: value.matchWholeWords,
    probability: String(value.probability),
  }
}

function applyBook(value: LorebookDto) {
  book.value = value
  metadata.name = value.name
  metadata.description = value.description
  metadata.visibility = value.visibility
  const revision =
    value.revisions.find((item) => item.isDraft) ??
    value.revisions.find((item) => item.id === value.currentRevisionId)
  metadata.scanDepth = String(revision?.scanDepth ?? 20)
  metadata.tokenBudget = String(revision?.tokenBudget ?? 2048)
  entries.value = revision?.entries.map(toEntryDraft) ?? []
  selectedEntryIndex.value = 0
}

async function createLorebook() {
  pageError.value = ''
  try {
    const created = await api.createLorebook({ name: '未命名世界书' })
    await studio.refreshLorebooks()
    applyBook(created)
    editorOpen.value = true
  } catch (error) {
    pageError.value = toIpcError(error).message
  }
}

async function openEditor(summary: LorebookSummaryDto) {
  editorError.value = ''
  loadingEditor.value = true
  editorOpen.value = true
  try {
    const value = await api.getLorebook({ lorebookId: summary.id })
    if (!value) throw new Error('世界书不存在')
    applyBook(value)
  } catch (error) {
    editorError.value = toIpcError(error).message
  } finally {
    loadingEditor.value = false
  }
}

async function ensureDraft() {
  if (!book.value || draftRevision.value) return
  applyBook(await api.createLorebookDraft({ lorebookId: book.value.id }))
}

function addEntry() {
  entries.value.push(emptyEntry())
  selectedEntryIndex.value = entries.value.length - 1
}

function duplicateEntry() {
  if (!selectedEntry.value) return
  entries.value.push({
    ...selectedEntry.value,
    id: undefined,
    title: `${selectedEntry.value.title} 副本`,
  })
  selectedEntryIndex.value = entries.value.length - 1
}

function removeEntry() {
  if (!selectedEntry.value) return
  entries.value.splice(selectedEntryIndex.value, 1)
  selectedEntryIndex.value = Math.max(0, selectedEntryIndex.value - 1)
}

function splitKeys(value: string): string[] {
  return [
    ...new Set(
      value
        .split(/[,，\n]/)
        .map((item) => item.trim())
        .filter(Boolean),
    ),
  ]
}

function positiveInteger(value: string, label: string, min = 0): number {
  const parsed = Number(value)
  if (!Number.isInteger(parsed) || parsed < min)
    throw new Error(`${label} 必须是不小于 ${min} 的整数`)
  return parsed
}

function entryInput(value: EntryDraft): LorebookEntryInput {
  const keys = splitKeys(value.keys)
  if (!value.constant && keys.length === 0)
    throw new Error(`条目“${value.title}”需要关键词或设为常驻`)
  return {
    id: value.id,
    title: value.title.trim(),
    keys,
    secondaryKeys: splitKeys(value.secondaryKeys),
    enabled: value.enabled,
    constant: value.constant,
    content: value.content.trim(),
    position: value.position,
    insertionDepth:
      value.position === 'at_depth'
        ? positiveInteger(value.insertionDepth, '插入深度')
        : 0,
    priority: Number(value.priority),
    matchMode: value.matchMode,
    caseSensitive: value.caseSensitive,
    matchWholeWords: value.matchWholeWords,
    probability: positiveInteger(value.probability, '触发概率'),
  }
}

async function saveLorebook(closeOnSuccess = true): Promise<boolean> {
  if (!book.value) return false
  editorError.value = ''
  saving.value = true
  try {
    await ensureDraft()
    const updated = await api.replaceLorebookEntries({
      lorebookId: book.value.id,
      name: metadata.name.trim(),
      description: metadata.description.trim(),
      visibility: metadata.visibility,
      scanDepth: positiveInteger(metadata.scanDepth, '扫描深度', 1),
      tokenBudget: positiveInteger(metadata.tokenBudget, 'Token 预算', 1),
      entries: entries.value.map(entryInput),
    })
    applyBook(updated)
    await studio.refreshLorebooks()
    if (closeOnSuccess) {
      editorOpen.value = false
      toast.success('世界书草稿已保存', {
        description: `“${updated.name}”的草稿内容已更新。`,
      })
    }
    return true
  } catch (error) {
    editorError.value = toIpcError(error).message
    return false
  } finally {
    saving.value = false
  }
}

async function publish() {
  if (!book.value) return
  publishing.value = true
  editorError.value = ''
  try {
    const desiredVisibility = metadata.visibility
    if (!book.value.currentRevisionId) metadata.visibility = 'private'
    if (!(await saveLorebook(false))) {
      metadata.visibility = desiredVisibility
      return
    }
    metadata.visibility = desiredVisibility
    const revisionId = draftRevision.value?.id
    if (!revisionId) throw new Error('世界书不存在可发布草稿')
    let updated = await api.publishLorebookRevision({
      lorebookId: book.value.id,
      revisionId,
    })
    if (metadata.visibility !== updated.visibility) {
      updated = await api.changeLorebookVisibility({
        lorebookId: updated.id,
        visibility: metadata.visibility,
      })
    }
    applyBook(updated)
    await studio.refreshLorebooks()
    editorOpen.value = false
    toast.success('世界书已发布', {
      description: `“${updated.name}”已发布为 v${updated.revisions.find((revision) => revision.id === updated.currentRevisionId)?.revisionNumber ?? ''}。`,
    })
  } catch (error) {
    editorError.value = toIpcError(error).message
  } finally {
    publishing.value = false
  }
}

async function confirmDelete() {
  if (!pendingDelete.value) return
  deleting.value = true
  pageError.value = ''
  try {
    await api.deleteLorebook({ lorebookId: pendingDelete.value.id })
    pendingDelete.value = null
    await studio.refreshLorebooks()
  } catch (error) {
    pageError.value = toIpcError(error).message
  } finally {
    deleting.value = false
  }
}
</script>

<template>
  <div class="mx-auto w-full max-w-280 px-6 py-7 lg:px-8">
    <PageHeader
      eyebrow="Lorebooks"
      title="世界书"
      description="维护关键词触发、注入位置、预算与版本化设定。"
    >
      <template #actions>
        <Button @click="createLorebook"><Plus :size="15" />新建世界书</Button>
      </template>
    </PageHeader>

    <p
      v-if="pageError"
      class="mt-5 rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive"
    >
      {{ pageError }}
    </p>
    <div class="mt-6 flex items-center justify-between gap-3">
      <div class="relative w-full max-w-xs">
        <Search
          class="absolute top-1/2 left-3 -translate-y-1/2 text-muted-foreground"
          :size="15"
        />
        <Input v-model="query" class="pl-9" placeholder="搜索世界书…" />
      </div>
      <span class="text-xs text-muted-foreground"
        >{{ filtered.length }}
        本世界书</span
      >
    </div>

    <div v-if="filtered.length" class="mt-5 space-y-3">
      <div
        v-for="item in filtered"
        :key="item.id"
        class="group flex w-full items-start gap-4 rounded-2xl border bg-card p-4 text-left hover:border-primary/40"
      >
        <div
          class="flex size-11 shrink-0 items-center justify-center rounded-xl bg-muted text-muted-foreground"
        >
          <BookMarked :size="20" />
        </div>
        <button
          type="button"
          class="min-w-0 flex-1 text-left"
          @click="openEditor(item)"
        >
          <div class="flex flex-wrap items-center gap-2">
            <h3 class="truncate text-sm font-semibold">{{ item.name }}</h3>
            <Badge variant="outline"
              >{{ item.visibility === 'private' ? '私有' : item.visibility === 'unlisted' ? '不公开' : '公开' }}</Badge
            ><Badge v-if="item.draftRevisionId" variant="soft"
              ><Clock :size="12" />草稿</Badge
            ><Badge v-else variant="success"><Check :size="12" />已发布</Badge>
          </div>
          <p class="mt-1 line-clamp-1 text-sm text-muted-foreground">
            {{ item.description || '暂无描述' }}
          </p>
          <div class="mt-2 flex gap-4 text-xs text-muted-foreground">
            <span>{{ item.entryCount }} 条目</span
            ><span>{{ item.revisionCount }} 个版本</span
            ><span>{{ timeAgo(item.updatedAt) }}更新</span>
          </div>
        </button>
        <DropdownMenu
          ><DropdownMenuTrigger as-child
            ><Button variant="ghost" size="icon-sm"
              ><MoreVertical :size="16" /></Button
            ></DropdownMenuTrigger
          ><DropdownMenuContent align="end"
            ><DropdownMenuLabel>操作</DropdownMenuLabel
            ><DropdownMenuItem @select="openEditor(item)"
              ><Pencil :size="14" />编辑</DropdownMenuItem
            ><DropdownMenuSeparator />
            <DropdownMenuItem
              variant="destructive"
              @select="pendingDelete = item"
              ><Trash2 :size="14" />删除</DropdownMenuItem
            ></DropdownMenuContent
          ></DropdownMenu
        >
      </div>
    </div>
    <EmptyState
      v-else
      class="mt-6"
      :icon="BookOpen"
      title="没有找到世界书"
      description="新建一本世界书来组织角色可引用的设定。"
      ><Button @click="createLorebook"
        ><Plus :size="15" />新建世界书</Button
      ></EmptyState
    >

    <Sheet v-model:open="editorOpen">
      <SheetContent side="right" class="w-full overflow-y-auto sm:max-w-5xl">
        <SheetHeader
          ><SheetTitle>{{ book?.name || '世界书编辑器' }}</SheetTitle
          ><SheetDescription
            >编辑草稿并发布不可变版本，角色可绑定具体已发布版本。</SheetDescription
          ></SheetHeader
        >
        <div
          v-if="loadingEditor"
          class="flex flex-1 items-center justify-center"
        >
          <Loader2 class="animate-spin" />
        </div>
        <div
          v-else-if="book"
          class="grid flex-1 gap-5 overflow-hidden px-4 pb-4 lg:grid-cols-[17rem_1fr]"
        >
          <aside class="flex min-h-0 flex-col gap-3 rounded-xl border p-3">
            <div class="flex items-center justify-between">
              <span class="text-sm font-medium"
                >条目 · {{ entries.length }}</span
              ><Button size="icon-sm" variant="ghost" @click="addEntry"
                ><Plus :size="15" /></Button
              >
            </div>
            <div class="space-y-1 overflow-y-auto">
              <button
                v-for="(entry, index) in entries"
                :key="entry.id ?? index"
                type="button"
                class="flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm"
                :class="index === selectedEntryIndex ? 'bg-accent text-accent-foreground' : 'hover:bg-muted'"
                @click="selectedEntryIndex = index"
              >
                <span class="truncate">{{ entry.title || '未命名条目' }}</span>
                <span
                  class="size-2 rounded-full"
                  :class="entry.enabled ? 'bg-success' : 'bg-muted-foreground/30'"
                />
              </button>
            </div>
          </aside>
          <main class="min-w-0 space-y-5 overflow-y-auto pr-1">
            <section class="grid gap-3 rounded-xl border p-4 sm:grid-cols-2">
              <div class="space-y-1.5">
                <span class="text-sm font-medium">名称</span>
                <Input v-model="metadata.name" />
              </div>
              <div class="space-y-1.5">
                <span class="text-sm font-medium">可见性</span
                ><Select v-model="metadata.visibility"
                  ><SelectTrigger><SelectValue /></SelectTrigger
                  ><SelectContent
                    ><SelectItem value="private">私有</SelectItem
                    ><SelectItem value="unlisted">不公开</SelectItem
                    ><SelectItem value="public">公开</SelectItem></SelectContent
                  ></Select
                >
              </div>
              <div class="space-y-1.5 sm:col-span-2">
                <span class="text-sm font-medium">描述</span>
                <Textarea v-model="metadata.description" rows="2" />
              </div>
              <div class="space-y-1.5">
                <span class="text-sm font-medium">扫描最近消息数</span>
                <Input
                  v-model="metadata.scanDepth"
                  type="number"
                  min="1"
                  max="1000"
                />
              </div>
              <div class="space-y-1.5">
                <span class="text-sm font-medium">Token 预算</span>
                <Input v-model="metadata.tokenBudget" type="number" min="1" />
              </div>
            </section>
            <section
              v-if="selectedEntry"
              class="space-y-4 rounded-xl border p-4"
            >
              <div class="flex items-center justify-between gap-3">
                <Input
                  v-model="selectedEntry.title"
                  class="max-w-md font-medium"
                />
                <div class="flex gap-1">
                  <Button variant="ghost" size="icon-sm" @click="duplicateEntry"
                    ><CopyPlus :size="15" /></Button
                  ><Button variant="ghost" size="icon-sm" @click="removeEntry"
                    ><Trash2 :size="15" /></Button
                  >
                </div>
              </div>
              <div class="grid gap-3 sm:grid-cols-2">
                <div class="space-y-1.5">
                  <span class="text-sm font-medium">主关键词</span>
                  <Input
                    v-model="selectedEntry.keys"
                    :disabled="selectedEntry.constant"
                    placeholder="Shirabe, Shirabe Tsukuyomi"
                  />
                </div>
                <div class="space-y-1.5">
                  <span class="text-sm font-medium">次要关键词</span>
                  <Input
                    v-model="selectedEntry.secondaryKeys"
                    :disabled="selectedEntry.constant"
                  />
                </div>
              </div>
              <div class="space-y-1.5">
                <span class="text-sm font-medium">注入内容</span>
                <Textarea v-model="selectedEntry.content" rows="8" />
              </div>
              <div class="grid gap-3 sm:grid-cols-3">
                <div class="space-y-1.5">
                  <span class="text-sm font-medium">位置</span
                  ><Select v-model="selectedEntry.position"
                    ><SelectTrigger><SelectValue /></SelectTrigger
                    ><SelectContent
                      ><SelectItem value="before_history">历史之前</SelectItem
                      ><SelectItem value="after_history">历史之后</SelectItem
                      ><SelectItem value="at_depth"
                        >指定深度</SelectItem
                      ></SelectContent
                    ></Select
                  >
                </div>
                <div class="space-y-1.5">
                  <span class="text-sm font-medium">插入深度</span>
                  <Input
                    v-model="selectedEntry.insertionDepth"
                    type="number"
                    min="0"
                    :disabled="selectedEntry.position !== 'at_depth'"
                  />
                </div>
                <div class="space-y-1.5">
                  <span class="text-sm font-medium">优先级</span>
                  <Input v-model="selectedEntry.priority" type="number" />
                </div>
                <div class="space-y-1.5">
                  <span class="text-sm font-medium">关键词规则</span
                  ><Select v-model="selectedEntry.matchMode"
                    ><SelectTrigger><SelectValue /></SelectTrigger
                    ><SelectContent
                      ><SelectItem value="any">命中任意</SelectItem
                      ><SelectItem value="all"
                        >全部命中</SelectItem
                      ></SelectContent
                    ></Select
                  >
                </div>
                <div class="space-y-1.5">
                  <span class="text-sm font-medium">触发概率 %</span>
                  <Input
                    v-model="selectedEntry.probability"
                    type="number"
                    min="0"
                    max="100"
                  />
                </div>
              </div>
              <div class="grid gap-3 sm:grid-cols-2">
                <span
                  class="flex items-center justify-between rounded-lg border p-3 text-sm"
                  >启用
                  <Switch v-model="selectedEntry.enabled" /></span
                ><span
                  class="flex items-center justify-between rounded-lg border p-3 text-sm"
                  >常驻条目
                  <Switch v-model="selectedEntry.constant" /></span
                ><span
                  class="flex items-center justify-between rounded-lg border p-3 text-sm"
                  >区分大小写
                  <Switch v-model="selectedEntry.caseSensitive" /></span
                ><span
                  class="flex items-center justify-between rounded-lg border p-3 text-sm"
                  >完整单词匹配
                  <Switch v-model="selectedEntry.matchWholeWords" /></span
                >
              </div>
            </section>
            <div
              v-else
              class="rounded-xl border border-dashed p-10 text-center text-sm text-muted-foreground"
            >
              点击左侧 + 创建第一个条目。
            </div>
            <p
              v-if="editorError"
              class="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive"
            >
              {{ editorError }}
            </p>
          </main>
        </div>
        <SheetFooter class="border-t"
          ><Badge variant="outline"
            >{{ draftRevision ? `草稿 v${draftRevision.revisionNumber}` : currentRevision ? `已发布 v${currentRevision.revisionNumber}` : '未发布' }}</Badge
          ><Button variant="ghost" @click="editorOpen = false"
            ><X :size="15" />关闭</Button
          ><Button
            variant="outline"
            :disabled="saving || publishing"
            @click="saveLorebook"
            ><Loader2 v-if="saving" class="animate-spin" :size="15" />
            <Check v-else :size="15" />保存草稿</Button
          ><Button :disabled="saving || publishing" @click="publish"
            ><Loader2 v-if="publishing" class="animate-spin" :size="15" />
            <Send v-else :size="15" />发布版本</Button
          ></SheetFooter
        >
      </SheetContent>
    </Sheet>

    <AlertDialog v-model:open="deleteDialogOpen"
      ><AlertDialogContent
        ><AlertDialogHeader
          ><AlertDialogTitle>删除 {{ pendingDelete?.name }}？</AlertDialogTitle
          ><AlertDialogDescription
            >世界书的全部版本和条目都将永久删除。</AlertDialogDescription
          ></AlertDialogHeader
        ><AlertDialogFooter
          ><AlertDialogCancel :disabled="deleting">取消</AlertDialogCancel
          ><Button
            variant="destructive"
            :disabled="deleting"
            @click="confirmDelete"
            ><Loader2 v-if="deleting" class="animate-spin" :size="15" />
            {{ deleting ? '删除中…' : '确认删除' }}</Button
          ></AlertDialogFooter
        ></AlertDialogContent
      ></AlertDialog
    >
  </div>
</template>
