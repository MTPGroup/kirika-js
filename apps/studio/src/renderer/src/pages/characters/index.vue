<script setup lang="ts">
import {
  BookMarked,
  Check,
  Clock,
  CopyPlus,
  Download,
  Loader2,
  MoreVertical,
  Plus,
  Search,
  Send,
  Trash2,
  Upload,
  User,
  X,
} from '@lucide/vue'
import EmptyState from '@renderer/components/layout/EmptyState.vue'
import PageHeader from '@renderer/components/layout/PageHeader.vue'
import {
  AlertDialog,
  AlertDialogAction,
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
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@renderer/components/ui/sheet'
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@renderer/components/ui/tabs'
import { Textarea } from '@renderer/components/ui/textarea'
import { initials, timeAgo } from '@renderer/lib/format'
import {
  api,
  type CharacterDto,
  type LorebookDto,
  toIpcError,
} from '@renderer/services/api'
import { useStudioStore } from '@renderer/stores/studio'
import { computed, onMounted, reactive, ref, toRaw } from 'vue'
import { toast } from 'vue-sonner'

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
const lorebookQuery = ref('')
const editorOpen = ref(false)
const deleteDialogOpen = ref(false)
const deleting = ref(false)
const pendingDelete = ref<{ id: string; name: string } | null>(null)
const editorLoading = ref(false)
const editorSaving = ref(false)
const editorPublishing = ref(false)
const editorError = ref('')
const editorCharacter = ref<CharacterDto | null>(null)
const greetings = ref<string[]>([])
const examples = ref<string[]>([])
const editorExtensions = ref<Readonly<Record<string, unknown>>>({})
const editorAssets = ref<CharacterDto['revisions'][number]['assets'][number][]>(
  [],
)
const editorLorebooks = ref<
  Array<{ lorebookRevisionId: string; ordinal: number; enabled: boolean }>
>([])
const characterForm = reactive({
  alias: '',
  name: '',
  description: '',
  personality: '',
  scenario: '',
  systemPrompt: '',
  postHistoryInstructions: '',
})

function toPlainRecord(
  value: Readonly<Record<string, unknown>>,
): Record<string, unknown> {
  return JSON.parse(JSON.stringify(toRaw(value))) as Record<string, unknown>
}

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

const filteredLorebooks = computed(() => {
  const terms = lorebookQuery.value
    .trim()
    .toLocaleLowerCase()
    .split(/\s+/)
    .filter(Boolean)
  if (!terms.length) return availableLorebooks.value
  return availableLorebooks.value.filter((book) => {
    const searchable = `${book.name} ${book.description}`.toLocaleLowerCase()
    return terms.every((term) => searchable.includes(term))
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

function applyCharacter(value: CharacterDto) {
  editorCharacter.value = value
  const revision =
    value.revisions.find((item) => item.isDraft) ??
    value.revisions.find((item) => item.id === value.currentRevisionId)
  characterForm.alias = value.alias ?? ''
  characterForm.name = revision?.name ?? ''
  characterForm.description = revision?.description ?? ''
  characterForm.personality = revision?.personality ?? ''
  characterForm.scenario = revision?.scenario ?? ''
  characterForm.systemPrompt = revision?.systemPrompt ?? ''
  characterForm.postHistoryInstructions =
    revision?.postHistoryInstructions ?? ''
  greetings.value = [...(revision?.greetings ?? [])]
  examples.value = [...(revision?.examples ?? [])]
  editorExtensions.value = structuredClone(revision?.extensions ?? {})
  editorAssets.value = [...(revision?.assets ?? [])]
  editorLorebooks.value = (revision?.lorebooks ?? []).map((item) => ({
    lorebookRevisionId: item.lorebookRevisionId,
    ordinal: item.ordinal,
    enabled: item.enabled,
  }))
}

async function createCharacter() {
  editorError.value = ''
  try {
    const created = await api.createCharacter({ name: '未命名角色' })
    applyCharacter(created)
    editorOpen.value = true
    await studio.refreshResources()
  } catch (error) {
    editorError.value = toIpcError(error).message
  }
}

async function openCharacterEditor(characterId: string) {
  editorOpen.value = true
  editorLoading.value = true
  editorError.value = ''
  try {
    let value = await api.getCharacter({ characterId })
    if (!value) throw new Error('角色不存在')
    if (!value.draftRevisionId) {
      value = await api.createCharacterDraft({ characterId })
    }
    applyCharacter(value)
  } catch (error) {
    editorError.value = toIpcError(error).message
  } finally {
    editorLoading.value = false
  }
}

function addGreeting() {
  greetings.value.push('')
}

function addExample() {
  examples.value.push('')
}

async function addCharacterAsset() {
  const character = editorCharacter.value
  if (!character) return
  editorError.value = ''
  try {
    const asset = await api.importCharacterAsset({
      characterId: character.id,
      kind: 'other',
    })
    if (asset)
      editorAssets.value.push({ ...asset, ordinal: editorAssets.value.length })
  } catch (error) {
    editorError.value = toIpcError(error).message
  }
}

async function saveCharacterDraft(closeOnSuccess = true): Promise<boolean> {
  const character = editorCharacter.value
  if (!character) return false
  editorSaving.value = true
  editorError.value = ''
  try {
    const updated = await api.saveCharacterDraft({
      characterId: character.id,
      alias: characterForm.alias.trim() || null,
      content: {
        name: characterForm.name.trim(),
        description: characterForm.description,
        personality: characterForm.personality,
        scenario: characterForm.scenario,
        systemPrompt: characterForm.systemPrompt,
        postHistoryInstructions: characterForm.postHistoryInstructions,
        greetings: [...greetings.value],
        examples: [...examples.value],
        extensions: toPlainRecord(editorExtensions.value),
      },
      assets: editorAssets.value.map((item, ordinal) => ({
        assetId: item.assetId,
        kind: item.kind,
        name: item.name,
        uri: item.uri,
        ordinal,
        extensions: toPlainRecord(item.extensions),
      })),
      lorebooks: editorLorebooks.value.map((item, ordinal) => ({
        lorebookRevisionId: item.lorebookRevisionId,
        ordinal,
        enabled: item.enabled,
      })),
    })
    applyCharacter(updated)
    await studio.refreshResources()
    if (closeOnSuccess) {
      editorOpen.value = false
      toast.success('角色草稿已保存', {
        description: `“${characterForm.name}”的草稿内容已更新。`,
      })
    }
    return true
  } catch (error) {
    editorError.value = toIpcError(error).message
    return false
  } finally {
    editorSaving.value = false
  }
}

async function publishCharacter() {
  const character = editorCharacter.value
  if (!character) return
  editorPublishing.value = true
  editorError.value = ''
  try {
    if (!(await saveCharacterDraft(false))) return
    const revisionId = editorCharacter.value?.draftRevisionId
    if (!revisionId) throw new Error('角色不存在可发布草稿')
    const updated = await api.publishCharacterRevision({
      characterId: character.id,
      revisionId,
    })
    applyCharacter(updated)
    editorOpen.value = false
    await studio.refreshResources()
    toast.success('角色已发布', {
      description: `“${characterForm.name}”的新版本现在可用于对话。`,
    })
  } catch (error) {
    editorError.value = toIpcError(error).message
  } finally {
    editorPublishing.value = false
  }
}

async function importCharacterCard() {
  await studio.execute(async () => {
    const imported = await api.importCharacterCard({ formatHint: 'json' })
    await studio.refreshResources()
    toast.success('角色卡已导入', {
      description: `“${imported.revisions[0]?.name ?? '角色'}”已创建为草稿。`,
    })
  })
}

async function editCharacterLorebooks(characterId: string) {
  lorebookDialogOpen.value = true
  lorebookQuery.value = ''
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
  const result = await studio.execute(() =>
    api.exportCharacterCard({ characterId, revisionId, format: 'json' }),
  )
  if (result && !result.cancelled)
    toast.success('角色卡已导出', { description: `${name}.json 已保存。` })
}

function confirmDelete(characterId: string, name: string) {
  pendingDelete.value = { id: characterId, name }
  deleteDialogOpen.value = true
}

async function deleteCharacter() {
  const target = pendingDelete.value
  if (!target) return
  deleting.value = true
  try {
    await api.deleteCharacter({ characterId: target.id })
    await studio.refreshResources()
    deleteDialogOpen.value = false
    pendingDelete.value = null
    toast.success('角色已删除')
  } catch (error) {
    toast.error('无法删除角色', {
      description: toIpcError(error).message,
    })
  } finally {
    deleting.value = false
  }
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
              <DropdownMenuItem @select="openCharacterEditor(chr.id)">
                <User :size="14" />编辑草稿
              </DropdownMenuItem>
              <DropdownMenuItem @select="editCharacterLorebooks(chr.id)">
                <BookMarked :size="14" />管理世界书
              </DropdownMenuItem>
              <DropdownMenuItem @select="exportCharacterCard(chr.id)"
                ><Download :size="14" />导出卡片</DropdownMenuItem
              >
              <DropdownMenuSeparator />
              <DropdownMenuItem
                variant="destructive"
                @select="confirmDelete(chr.id, chr.name)"
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
    <AlertDialog v-model:open="deleteDialogOpen">
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>删除 {{ pendingDelete?.name }}？</AlertDialogTitle>
          <AlertDialogDescription>
            角色的全部草稿和已发布版本都会永久删除。被会话引用的角色无法删除。
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel :disabled="deleting">取消</AlertDialogCancel>
          <AlertDialogAction :disabled="deleting" @click="deleteCharacter">
            <Loader2 v-if="deleting" class="animate-spin" :size="15" />
            删除角色
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>

    <Sheet v-model:open="editorOpen">
      <SheetContent side="right" class="w-full overflow-y-auto sm:max-w-4xl">
        <SheetHeader>
          <SheetTitle>{{ characterForm.name || '角色编辑器' }}</SheetTitle>
          <SheetDescription>
            编辑角色草稿。发布后会生成不可变版本并可用于实际对话。
          </SheetDescription>
        </SheetHeader>
        <div
          v-if="editorLoading"
          class="flex flex-1 items-center justify-center"
        >
          <Loader2 class="animate-spin" />
        </div>
        <Tabs
          v-else-if="editorCharacter"
          default-value="profile"
          class="min-h-0 flex-1 px-4"
        >
          <TabsList class="w-full justify-start">
            <TabsTrigger value="profile">基础资料</TabsTrigger>
            <TabsTrigger value="prompts">提示词</TabsTrigger>
            <TabsTrigger value="greetings">问候语</TabsTrigger>
            <TabsTrigger value="examples">对话示例</TabsTrigger>
            <TabsTrigger value="assets">资源</TabsTrigger>
            <TabsTrigger value="versions">版本</TabsTrigger>
          </TabsList>
          <TabsContent value="profile" class="grid gap-4 py-4 sm:grid-cols-2">
            <div class="flex flex-col gap-1.5 text-sm font-medium">
              角色名称
              <Input v-model="characterForm.name" maxlength="200" />
            </div>
            <div class="flex flex-col gap-1.5 text-sm font-medium">
              别名
              <Input v-model="characterForm.alias" maxlength="200" />
            </div>
            <div
              class="flex flex-col gap-1.5 text-sm font-medium sm:col-span-2"
            >
              描述
              <Textarea v-model="characterForm.description" rows="6" />
            </div>
            <div
              class="flex flex-col gap-1.5 text-sm font-medium sm:col-span-2"
            >
              性格
              <Textarea v-model="characterForm.personality" rows="5" />
            </div>
            <div
              class="flex flex-col gap-1.5 text-sm font-medium sm:col-span-2"
            >
              场景
              <Textarea v-model="characterForm.scenario" rows="5" />
            </div>
          </TabsContent>
          <TabsContent value="prompts" class="flex flex-col gap-4 py-4">
            <div class="flex flex-col gap-1.5 text-sm font-medium">
              系统提示词
              <Textarea
                v-model="characterForm.systemPrompt"
                rows="10"
                placeholder="支持 {{char}}、{{user}} 与 {{original}} 宏。"
              />
            </div>
            <div class="flex flex-col gap-1.5 text-sm font-medium">
              历史后指令
              <Textarea
                v-model="characterForm.postHistoryInstructions"
                rows="8"
              />
            </div>
          </TabsContent>
          <TabsContent value="greetings" class="flex flex-col gap-3 py-4">
            <div class="flex items-center justify-between">
              <p class="text-sm text-muted-foreground">
                至少添加一条问候语后才能发布。
              </p>
              <Button size="sm" variant="outline" @click="addGreeting"
                ><Plus :size="14" />添加问候语</Button
              >
            </div>
            <div
              v-for="(_, index) in greetings"
              :key="index"
              class="flex items-start gap-2"
            >
              <Textarea
                v-model="greetings[index]"
                rows="4"
                :placeholder="`问候语 ${index + 1}`"
              />
              <Button
                size="icon-sm"
                variant="ghost"
                @click="greetings.splice(index, 1)"
                ><X :size="14" /></Button
              >
            </div>
            <p
              v-if="!greetings.length"
              class="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground"
            >
              尚未添加问候语。
            </p>
          </TabsContent>
          <TabsContent value="examples" class="flex flex-col gap-3 py-4">
            <div class="flex items-center justify-between">
              <p class="text-sm text-muted-foreground">
                示例会进入角色提示词，可使用 &#123;&#123;user&#125;&#125; 和
                &#123;&#123;char&#125;&#125;。
              </p>
              <Button size="sm" variant="outline" @click="addExample"
                ><CopyPlus :size="14" />添加示例</Button
              >
            </div>
            <div
              v-for="(_, index) in examples"
              :key="index"
              class="flex items-start gap-2"
            >
              <Textarea
                v-model="examples[index]"
                rows="6"
                :placeholder="`示例 ${index + 1}`"
              />
              <Button
                size="icon-sm"
                variant="ghost"
                @click="examples.splice(index, 1)"
                ><X :size="14" /></Button
              >
            </div>
            <p
              v-if="!examples.length"
              class="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground"
            >
              尚未添加对话示例。
            </p>
          </TabsContent>
          <TabsContent value="assets" class="flex flex-col gap-3 py-4">
            <div class="flex items-center justify-between">
              <p class="text-sm text-muted-foreground">
                资源会随角色版本保存，并可嵌入导出的 JSON 角色卡。
              </p>
              <Button size="sm" variant="outline" @click="addCharacterAsset"
                ><Upload :size="14" />添加资源</Button
              >
            </div>
            <div
              v-for="(asset, index) in editorAssets"
              :key="asset.assetId"
              class="flex items-center gap-3 rounded-xl border p-3"
            >
              <div class="min-w-0 flex-1">
                <p class="truncate text-sm font-medium">{{ asset.name }}</p>
                <p class="truncate text-xs text-muted-foreground">
                  {{ asset.kind }}
                  · {{ asset.uri }}
                </p>
              </div>
              <Button
                size="icon-sm"
                variant="ghost"
                @click="editorAssets.splice(index, 1)"
                ><X :size="14" /></Button
              >
            </div>
            <p
              v-if="!editorAssets.length"
              class="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground"
            >
              尚未添加角色资源。
            </p>
          </TabsContent>
          <TabsContent value="versions" class="flex flex-col gap-3 py-4">
            <p class="text-sm text-muted-foreground">
              已发布版本不可修改；编辑已发布角色时会自动创建下一个草稿版本。
            </p>
            <div
              v-for="revision in [...editorCharacter.revisions].sort((a, b) => b.revisionNumber - a.revisionNumber)"
              :key="revision.id"
              class="flex items-center gap-3 rounded-xl border p-3"
            >
              <div class="min-w-0 flex-1">
                <p class="truncate text-sm font-medium">
                  v{{ revision.revisionNumber }}
                  · {{ revision.name }}
                </p>
                <p class="text-xs text-muted-foreground">
                  {{ revision.isDraft ? '草稿' : '已发布' }}
                  · {{ revision.greetings.length }} 条问候语 ·
                  {{ revision.assets.length }}
                  个资源
                </p>
              </div>
              <Badge :variant="revision.isDraft ? 'soft' : 'success'"
                >{{ revision.isDraft ? '草稿' : '已发布' }}</Badge
              >
              <Badge
                v-if="revision.id === editorCharacter.currentRevisionId"
                variant="outline"
                >当前版本</Badge
              >
            </div>
          </TabsContent>
        </Tabs>
        <p
          v-if="editorError"
          class="mx-4 rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive"
        >
          {{ editorError }}
        </p>
        <SheetFooter class="border-t">
          <Badge variant="outline">
            {{ editorCharacter?.draftRevisionId ? '草稿' : '已发布' }}
          </Badge>
          <Button variant="ghost" @click="editorOpen = false"
            ><X :size="15" />关闭</Button
          >
          <Button
            variant="outline"
            :disabled="editorSaving || editorPublishing"
            @click="saveCharacterDraft()"
          >
            <Loader2 v-if="editorSaving" class="animate-spin" :size="15" />
            <Check v-else :size="15" />保存草稿
          </Button>
          <Button
            :disabled="editorSaving || editorPublishing"
            @click="publishCharacter"
          >
            <Loader2 v-if="editorPublishing" class="animate-spin" :size="15" />
            <Send v-else :size="15" />发布版本
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>

    <Dialog v-model:open="lorebookDialogOpen">
      <DialogContent class="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>管理角色世界书</DialogTitle>
          <DialogDescription>
            为角色草稿绑定世界书当前已发布版本。发布新世界书版本后可在这里重新选择。
          </DialogDescription>
        </DialogHeader>
        <div v-if="!lorebookLoading" class="relative">
          <Search
            class="text-muted-foreground absolute top-1/2 left-3 -translate-y-1/2"
            :size="15"
          />
          <Input
            v-model="lorebookQuery"
            placeholder="搜索世界书名称或描述…"
            class="pl-9"
          />
        </div>
        <div v-if="lorebookLoading" class="flex justify-center py-10">
          <Loader2 class="animate-spin" />
        </div>
        <div v-else class="max-h-96 space-y-2 overflow-y-auto">
          <button
            v-for="book in filteredLorebooks"
            :key="book.id"
            type="button"
            class="flex min-h-14 w-full items-center gap-3 rounded-xl border px-3 py-2 text-left hover:bg-muted"
            :class="selectedLorebookRevisions.includes(book.currentRevisionId ?? '') ? 'border-primary bg-primary/5' : ''"
            @click="book.currentRevisionId && toggleLorebookRevision(book.currentRevisionId)"
          >
            <BookMarked :size="18" />
            <span class="min-w-0 flex-1">
              <span class="block truncate text-sm font-medium"
                >{{ book.name }}</span
              >
              <span class="block truncate text-xs text-muted-foreground">
                v{{ book.revisions.find((revision) => revision.id === book.currentRevisionId)?.revisionNumber }}
                <template v-if="book.description">
                  · {{ book.description }}</template
                >
              </span>
            </span>
            <Badge
              v-if="selectedLorebookRevisions.includes(book.currentRevisionId ?? '')"
              variant="soft"
              class="shrink-0"
            >
              <Check :size="12" />
              已绑定
            </Badge>
          </button>
          <p
            v-if="!availableLorebooks.length"
            class="py-8 text-center text-sm text-muted-foreground"
          >
            暂无已发布世界书，请先在世界书页面发布一个版本。
          </p>
          <p
            v-else-if="!filteredLorebooks.length"
            class="py-8 text-center text-sm text-muted-foreground"
          >
            没有匹配“{{ lorebookQuery.trim() }}”的世界书。
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
