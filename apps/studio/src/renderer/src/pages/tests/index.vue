<script setup lang="ts">
import {
  Activity,
  BarChart3,
  Code2,
  FileText,
  History,
  Loader2,
  Play,
  RotateCcw,
  Sparkles,
  Square,
  Terminal,
  Wand2,
} from '@lucide/vue'
import PageHeader from '@renderer/components/layout/PageHeader.vue'
import { Badge } from '@renderer/components/ui/badge'
import { Button } from '@renderer/components/ui/button'
import { Input } from '@renderer/components/ui/input'
import { ScrollArea } from '@renderer/components/ui/scroll-area'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@renderer/components/ui/select'
import { Switch } from '@renderer/components/ui/switch'
import { Tabs, TabsList, TabsTrigger } from '@renderer/components/ui/tabs'
import { Textarea } from '@renderer/components/ui/textarea'
import {
  api,
  type CharacterDto,
  type ConversationMessageDto,
  type GenerationEvent,
  type GenerationRequestDto,
  type LorebookDto,
} from '@renderer/services/api'
import { useGenerationStore } from '@renderer/stores/generation'
import { useStudioStore } from '@renderer/stores/studio'
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'

type Tab = 'response' | 'prompt' | 'request' | 'metrics' | 'logs'
type TerminalEvent = Extract<GenerationEvent, { type: 'completed' | 'failed' | 'cancelled' }>
interface TestRun {
  id: string
  createdAt: string
  character: string
  revision: string
  input: string
  output: string
  request: GenerationRequestDto | null
  terminal: TerminalEvent | null
  durationMs: number
}

const studio = useStudioStore()
const generation = useGenerationStore()
const characters = ref<CharacterDto[]>([])
const lorebooks = ref<LorebookDto[]>([])
const loading = ref(true)
const activeTab = ref<Tab>('response')
const selectedCharacterId = ref('')
const selectedRevisionId = ref('')
const selectedLorebookRevisionIds = ref<string[]>([])
const includeCharacterLorebooks = ref(true)
const selectedProviderId = ref('')
const model = ref('')
const temperature = ref('0.8')
const maxTokens = ref('1024')
const testInput = ref('')
const conversationMode = ref(false)
const conversationId = ref<string | null>(null)
const startedAt = ref<number | null>(null)
const finishedAt = ref<number | null>(null)
const clock = ref(Date.now())
const validationError = ref('')
let clockTimer: ReturnType<typeof setInterval> | null = null
const request = ref<GenerationRequestDto | null>(null)
const terminal = ref<TerminalEvent | null>(null)
const logs = ref<string[]>([])
const history = ref<TestRun[]>([])
const conversationMessages = ref<readonly ConversationMessageDto[]>([])
const compareRun = ref<TestRun | null>(null)
const activeRunSnapshot = ref<Pick<TestRun, 'character' | 'revision' | 'input'> | null>(null)

const selectedCharacter = computed(
  () => characters.value.find((item) => item.id === selectedCharacterId.value) ?? null,
)
const selectedRevision = computed(
  () =>
    selectedCharacter.value?.revisions.find((item) => item.id === selectedRevisionId.value) ?? null,
)
const selectedProvider = computed(
  () => studio.providers.find((item) => item.id === selectedProviderId.value) ?? null,
)
const revisionOptions = computed(() =>
  [...(selectedCharacter.value?.revisions ?? [])].sort(
    (a, b) => b.revisionNumber - a.revisionNumber,
  ),
)
const characterBoundLorebookIds = computed(() =>
  (selectedRevision.value?.lorebooks ?? [])
    .filter((reference) => reference.enabled)
    .sort((left, right) => left.ordinal - right.ordinal)
    .map((reference) => reference.lorebookRevisionId),
)
const lorebookRevisionOptions = computed(() =>
  lorebooks.value.flatMap((book) =>
    book.revisions.map((revision) => ({
      ...revision,
      bookId: book.id,
      bookName: book.name,
      label: `${book.name} · v${revision.revisionNumber}${revision.isDraft ? ' 草稿' : ' 已发布'}`,
    })),
  ),
)
const running = computed(() => generation.running)
const output = computed(() => generation.output)
const durationMs = computed(() =>
  startedAt.value ? Math.max(0, (finishedAt.value ?? clock.value) - startedAt.value) : 0,
)
const tokenUsage = computed(() =>
  terminal.value?.type === 'completed' ? terminal.value.tokenUsage : null,
)
const finishLabel = computed(() =>
  terminal.value?.type === 'completed'
    ? terminal.value.finishReason
    : terminal.value?.type === 'failed'
      ? 'failed'
      : terminal.value?.type === 'cancelled'
        ? 'cancelled'
        : '—',
)
const rate = computed(() =>
  tokenUsage.value && durationMs.value > 0
    ? `${(tokenUsage.value.completionTokens / (durationMs.value / 1000)).toFixed(1)}/s`
    : '—',
)
const tabs = [
  { id: 'response' as const, label: '响应', icon: FileText },
  { id: 'prompt' as const, label: 'Prompt', icon: Wand2 },
  { id: 'request' as const, label: '请求', icon: Code2 },
  { id: 'metrics' as const, label: '指标', icon: BarChart3 },
  { id: 'logs' as const, label: '日志', icon: Terminal },
]

function now() {
  return new Date().toLocaleTimeString()
}
function log(message: string) {
  logs.value.push(`[${now()}] ${message}`)
}
function messageText(content: ConversationMessageDto['content']) {
  if (typeof content === 'string') return content
  return content.map((part) => (part.type === 'text' ? part.text : `[${part.type}]`)).join('')
}
function _partText(parts: readonly { type: string; text?: string }[]) {
  return parts.map((part) => (part.type === 'text' ? (part.text ?? '') : `[${part.type}]`)).join('')
}
function resetRunState() {
  request.value = null
  terminal.value = null
  compareRun.value = null
  logs.value = []
  startedAt.value = null
  finishedAt.value = null
  validationError.value = ''
}
function discardConversation() {
  const id = conversationId.value
  conversationId.value = null
  conversationMessages.value = []
  if (id) void api.deleteConversation({ conversationId: id }).catch(() => undefined)
}
function resetConversation(reason = '配置已变化') {
  discardConversation()
  generation.clearRun()
  resetRunState()
  log(`${reason}，已重置测试会话`)
}

onMounted(async () => {
  clockTimer = setInterval(() => {
    if (running.value) clock.value = Date.now()
  }, 100)
  try {
    await studio.execute(studio.refreshResources)
    const [loadedCharacters, loadedLorebooks] = await Promise.all([
      Promise.all(studio.characters.map((item) => api.getCharacter({ characterId: item.id }))),
      Promise.all(studio.lorebooks.map((item) => api.getLorebook({ lorebookId: item.id }))),
    ])
    characters.value = loadedCharacters.filter((item): item is CharacterDto => item !== null)
    lorebooks.value = loadedLorebooks.filter((item): item is LorebookDto => item !== null)
    selectedCharacterId.value = characters.value[0]?.id ?? ''
    selectedProviderId.value = studio.providers.find((item) => item.enabled)?.id ?? ''
  } finally {
    loading.value = false
  }
})

onBeforeUnmount(() => {
  if (clockTimer) clearInterval(clockTimer)
  const id = conversationId.value
  conversationId.value = null
  conversationMessages.value = []
  void (async () => {
    if (running.value) await generation.abort().catch(() => undefined)
    if (id) await api.deleteConversation({ conversationId: id }).catch(() => undefined)
  })()
})

watch(selectedCharacterId, () => {
  selectedRevisionId.value =
    selectedCharacter.value?.currentRevisionId ?? selectedCharacter.value?.draftRevisionId ?? ''
  resetConversation('角色已变化')
})
watch(selectedProviderId, () => {
  model.value = selectedProvider.value?.defaultModel ?? ''
  resetConversation('Provider 已变化')
})
watch([selectedRevisionId, includeCharacterLorebooks], () => resetConversation('生成上下文已变化'))
let processedEventCount = 0
watch(
  () => generation.events.length,
  (length) => {
    if (length < processedEventCount) processedEventCount = 0
    for (const event of generation.events.slice(processedEventCount, length)) {
      if (event.type === 'preparing') {
        log(
          `准备阶段：${({ provider: '读取 Provider', conversation: '读取会话', history: '读取历史', context: '编译上下文' } as const)[event.stage]}`,
        )
      } else if (event.type === 'started') {
        request.value = event.request
        log(`请求已开始：${event.request.model}`)
      } else if (event.type === 'text_delta') log(`收到文本增量：${event.delta.length} 字符`)
      else if (event.type === 'content_part') log(`收到内容片段：${event.part.type}`)
      else {
        terminal.value = event
        finishedAt.value = Date.now()
        log(
          event.type === 'completed'
            ? `生成完成：${event.finishReason}`
            : event.type === 'failed'
              ? `生成失败：${event.reason}`
              : '生成已取消',
        )
        saveRun()
        if (!conversationMode.value || event.type === 'failed') {
          const id = generation.conversationId
          conversationId.value = null
          conversationMessages.value = []
          if (id) void api.deleteConversation({ conversationId: id }).catch(() => undefined)
        } else void refreshConversationHistory()
      }
    }
    processedEventCount = length
  },
)

async function start() {
  validationError.value = ''
  if (!selectedRevision.value) validationError.value = '请选择可用的角色版本'
  else if (!selectedProvider.value) validationError.value = '请选择已启用的 Provider'
  else if (!testInput.value.trim()) validationError.value = '测试消息不能为空'
  if (validationError.value || running.value || !selectedRevision.value || !selectedProvider.value)
    return
  const parsedTemperature = Number(temperature.value)
  const parsedMaxTokens = Number(maxTokens.value)
  if (!Number.isFinite(parsedTemperature) || parsedTemperature < 0 || parsedTemperature > 2)
    validationError.value = 'Temperature 必须是 0 到 2 的数值'
  else if (!Number.isSafeInteger(parsedMaxTokens) || parsedMaxTokens < 1)
    validationError.value = 'Max Tokens 必须是大于 0 的整数'
  if (validationError.value) return
  resetRunState()
  processedEventCount = 0
  startedAt.value = Date.now()
  clock.value = startedAt.value
  activeRunSnapshot.value = {
    character: selectedRevision.value.name,
    revision: `v${selectedRevision.value.revisionNumber}`,
    input: testInput.value.trim(),
  }
  log(`使用 ${selectedRevision.value.name} v${selectedRevision.value.revisionNumber}`)
  await generation.start({
    characterId: selectedCharacterId.value,
    characterRevisionId: selectedRevisionId.value,
    allowDraftCharacterRevision: selectedRevision.value.isDraft,
    cleanupConversationOnFailure: !conversationId.value,
    conversationId: conversationMode.value ? (conversationId.value ?? undefined) : undefined,
    providerId: selectedProvider.value.id,
    model: model.value || selectedProvider.value.defaultModel,
    text: testInput.value.trim(),
    temperature: parsedTemperature,
    maxOutputTokens: parsedMaxTokens,
    contextOverride: {
      includeCharacterLorebooks: includeCharacterLorebooks.value,
      lorebookRevisionIds: [...selectedLorebookRevisionIds.value],
    },
  })
  if (conversationMode.value) conversationId.value = generation.conversationId
}
async function stop() {
  log('正在取消生成…')
  await generation.abort()
}
async function refreshConversationHistory() {
  if (!generation.conversationId) return
  const result = await api.getConversationHistory({
    conversationId: generation.conversationId,
  })
  conversationMessages.value = result.path
}
function saveRun() {
  const snapshot = activeRunSnapshot.value
  if (!startedAt.value || !snapshot || (!generation.output && !terminal.value)) return
  history.value.unshift({
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
    character: snapshot.character,
    revision: snapshot.revision,
    input: snapshot.input,
    output: generation.output,
    request: request.value,
    terminal: terminal.value,
    durationMs: (finishedAt.value ?? Date.now()) - startedAt.value,
  })
  history.value = history.value.slice(0, 20)
  activeRunSnapshot.value = null
}
function clearConversation() {
  discardConversation()
  generation.clearRun()
  resetRunState()
  log('连续对话上下文和当前响应已清空')
}
function toggleLorebook(id: string) {
  if (running.value) return
  selectedLorebookRevisionIds.value = selectedLorebookRevisionIds.value.includes(id)
    ? selectedLorebookRevisionIds.value.filter((value) => value !== id)
    : [...selectedLorebookRevisionIds.value, id]
  resetConversation('世界书覆盖已变化')
}
</script>

<template>
  <div class="mx-auto w-full max-w-300 px-6 py-7 lg:px-8">
    <PageHeader
      eyebrow="Tests"
      title="生成测试台"
      description="用精确角色与世界书版本运行真实生成，并检查模型请求、Prompt、指标和事件。"
    >
      <template #actions>
        <Button v-if="running" variant="destructive" @click="stop">
          <Square :size="15" />停止
        </Button>
        <Button v-else @click="start"> <Play :size="15" />运行生成 </Button>
      </template>
    </PageHeader>

    <div
      v-if="validationError"
      class="mt-5 rounded-xl border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm text-amber-800 dark:text-amber-300"
    >
      {{ validationError }}
    </div>
    <div
      v-if="generation.error"
      class="mt-5 rounded-xl border border-destructive/40 bg-destructive/10 px-4 py-3"
    >
      <p class="text-sm font-semibold text-destructive">生成失败</p>
      <p class="mt-1 text-sm text-destructive/90">
        {{ generation.error.message }}
      </p>
    </div>
    <div v-if="loading" class="flex justify-center py-24">
      <Loader2 class="animate-spin" />
    </div>
    <div v-else class="mt-6 flex flex-col items-stretch gap-5 lg:flex-row">
      <aside class="lg:w-2/5">
        <div class="h-full space-y-4 rounded-2xl border bg-card p-5">
          <h2 class="text-sm font-semibold">真实生成配置</h2>
          <div class="space-y-1.5">
            <div class="text-sm font-medium">角色</div>
            <Select v-model="selectedCharacterId" :disabled="running">
              <SelectTrigger>
                <SelectValue placeholder="选择角色" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem v-for="item in characters" :key="item.id" :value="item.id">
                  {{ item.revisions.find((r) => r.id === (item.currentRevisionId ?? item.draftRevisionId))?.name ?? '角色' }}
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div class="space-y-1.5">
            <div class="text-sm font-medium">精确角色版本</div>
            <Select v-model="selectedRevisionId" :disabled="running">
              <SelectTrigger>
                <SelectValue placeholder="选择版本" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem
                  v-for="revision in revisionOptions"
                  :key="revision.id"
                  :value="revision.id"
                >
                  v{{ revision.revisionNumber }}
                  · {{ revision.isDraft ? '草稿' : '已发布' }} ·
                  {{ revision.name }}
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div class="space-y-2">
            <div class="flex items-center justify-between">
              <span class="text-sm font-medium">包含角色绑定世界书</span>
              <Switch v-model="includeCharacterLorebooks" :disabled="running" />
            </div>
            <p class="text-xs text-muted-foreground">关闭后仅使用下方手动选择的精确版本。</p>
            <div v-if="includeCharacterLorebooks" class="flex flex-wrap gap-1.5">
              <Badge v-for="id in characterBoundLorebookIds" :key="id" variant="outline">
                {{ lorebookRevisionOptions.find((item) => item.id === id)?.label ?? id }}
              </Badge>
              <p v-if="!characterBoundLorebookIds.length" class="text-xs text-muted-foreground">
                当前角色版本没有已启用的世界书绑定。
              </p>
            </div>
          </div>
          <div class="space-y-2">
            <div class="text-sm font-medium">附加世界书版本</div>
            <div class="max-h-44 space-y-1 overflow-y-auto rounded-xl border p-2">
              <button
                v-for="revision in lorebookRevisionOptions"
                :key="revision.id"
                type="button"
                class="flex w-full items-center justify-between rounded-lg px-2 py-1.5 text-left text-xs hover:bg-muted disabled:cursor-not-allowed disabled:opacity-60"
                :disabled="running"
                :class="selectedLorebookRevisionIds.includes(revision.id) ? 'bg-primary/10 text-primary' : ''"
                @click="toggleLorebook(revision.id)"
              >
                <span class="truncate">{{ revision.label }}</span>
                <Badge v-if="selectedLorebookRevisionIds.includes(revision.id)" variant="soft">
                  已选择
                </Badge>
              </button>
              <p
                v-if="!lorebookRevisionOptions.length"
                class="p-3 text-center text-xs text-muted-foreground"
              >
                暂无世界书版本
              </p>
            </div>
          </div>
          <div class="space-y-1.5">
            <div class="text-sm font-medium">Provider</div>
            <Select v-model="selectedProviderId" :disabled="running">
              <SelectTrigger>
                <SelectValue placeholder="选择 Provider" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem
                  v-for="provider in studio.providers.filter((item) => item.enabled)"
                  :key="provider.id"
                  :value="provider.id"
                >
                  {{ provider.name }}
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div class="space-y-1.5">
            <div class="text-sm font-medium">模型</div>
            <Input v-model="model" placeholder="模型名称" />
          </div>
          <div class="grid grid-cols-2 gap-3">
            <div>
              <div class="text-sm font-medium">Temperature</div>
              <Input v-model="temperature" type="number" min="0" max="2" step="0.1" />
            </div>
            <div>
              <div class="text-sm font-medium">Max Tokens</div>
              <Input v-model="maxTokens" type="number" min="1" />
            </div>
          </div>
          <div class="space-y-1.5">
            <div class="text-sm font-medium">测试消息</div>
            <Textarea v-model="testInput" placeholder="请输入测试文本" rows="6" />
          </div>
          <div class="flex items-center justify-between rounded-xl border p-3">
            <div>
              <p class="text-sm font-medium">连续对话</p>
              <p class="text-xs text-muted-foreground">复用同一个真实会话历史</p>
            </div>
            <Switch v-model="conversationMode" :disabled="running" />
          </div>
          <Button v-if="conversationId" variant="outline" size="sm" @click="clearConversation">
            <RotateCcw :size="14" />清空测试会话
          </Button>
        </div>
      </aside>

      <Tabs v-model="activeTab" class="min-h-0 lg:w-3/5">
        <section class="flex h-full min-h-150 flex-col overflow-hidden rounded-2xl border bg-card">
          <div class="flex items-center gap-1 border-b p-1.5">
            <TabsList class="h-auto bg-transparent">
              <TabsTrigger v-for="tab in tabs" :key="tab.id" :value="tab.id">
                <component :is="tab.icon" :size="14" />
                {{ tab.label }}
              </TabsTrigger>
            </TabsList>
            <Badge
              class="ml-auto"
              :variant="running ? 'default' : terminal?.type === 'failed' ? 'destructive' : 'outline'"
            >
              <Activity v-if="running" :size="12" class="animate-pulse" />
              {{ running ? '生成中' : finishLabel }}
            </Badge>
          </div>
          <ScrollArea class="min-h-0 flex-1">
            <div class="p-5">
              <div v-if="activeTab === 'response'" class="space-y-4">
                <div
                  v-if="!output && !running"
                  class="flex min-h-96 flex-col items-center justify-center gap-2 text-sm text-muted-foreground"
                >
                  <Sparkles :size="22" />运行后显示真实流式响应
                </div>
                <div
                  v-if="conversationMode && conversationMessages.length"
                  class="space-y-2 rounded-xl border bg-muted/20 p-3"
                >
                  <p class="text-xs font-semibold text-muted-foreground">真实会话历史</p>
                  <div
                    v-for="message in conversationMessages"
                    :key="message.id"
                    class="rounded-lg px-3 py-2 text-sm"
                    :class="message.source === 'human' ? 'ml-12 bg-primary text-primary-foreground' : 'mr-12 bg-muted'"
                  >
                    <p class="mb-1 text-[10px] uppercase opacity-70">
                      {{ message.source }}· {{ message.status }}
                    </p>
                    <p class="whitespace-pre-wrap">
                      {{ messageText(message.content) }}
                    </p>
                  </div>
                </div>
                <p v-if="output || running" class="whitespace-pre-wrap text-sm leading-7">
                  {{ output }}
                  <span v-if="running" class="animate-pulse">▍</span>
                </p>
                <div v-if="compareRun" class="rounded-xl border border-dashed p-4">
                  <div class="mb-2 flex justify-between text-xs font-semibold">
                    <span>
                      对比：{{ compareRun.character }}
                      {{ compareRun.revision }}
                    </span>
                    <Button size="sm" variant="ghost" @click="compareRun = null">关闭</Button>
                  </div>
                  <p class="whitespace-pre-wrap text-xs text-muted-foreground">
                    {{ compareRun.output }}
                  </p>
                </div>
              </div>
              <div v-else-if="activeTab === 'prompt'" class="space-y-3">
                <p v-if="!request" class="text-sm text-muted-foreground">
                  生成开始后显示 ChatEngine 实际编译的消息。
                </p>
                <div
                  v-for="(message, index) in request?.messages ?? []"
                  :key="index"
                  class="rounded-xl border p-3"
                >
                  <Badge variant="outline">
                    {{ message.role }}
                    <template v-if="message.name"> · {{ message.name }}</template>
                  </Badge>
                  <pre
                    class="mt-2 whitespace-pre-wrap font-mono text-xs"
                  >{{ _partText(message.content) }}</pre>
                </div>
              </div>
              <div v-else-if="activeTab === 'request'" class="space-y-3">
                <pre
                  class="overflow-x-auto rounded-xl bg-muted/50 p-4 text-xs"
                >{{ request ? JSON.stringify(request, null, 2) : '生成开始后显示实际模型请求（不包含 API Key）。' }}</pre>
              </div>
              <div
                v-else-if="activeTab === 'metrics'"
                class="grid grid-cols-2 gap-3 md:grid-cols-3"
              >
                <div
                  v-for="item in [{ label: 'Prompt Tokens', value: tokenUsage?.promptTokens ?? '—' }, { label: 'Completion Tokens', value: tokenUsage?.completionTokens ?? '—' }, { label: 'Total Tokens', value: tokenUsage?.totalTokens ?? '—' }, { label: '耗时', value: startedAt ? `${(durationMs / 1000).toFixed(2)}s` : '—' }, { label: '吞吐', value: rate }, { label: 'Finish', value: finishLabel }]"
                  :key="item.label"
                  class="rounded-xl border p-4"
                >
                  <p class="text-xs text-muted-foreground">{{ item.label }}</p>
                  <p class="mt-1 text-xl font-semibold">{{ item.value }}</p>
                </div>
              </div>
              <div v-else class="flex flex-col gap-1 pr-3">
                <p
                  v-for="(line, index) in logs"
                  :key="index"
                  class="font-mono text-xs text-muted-foreground"
                >
                  {{ line }}
                </p>
                <p v-if="!logs.length" class="text-sm text-muted-foreground">
                  运行后显示真实生成事件日志。
                </p>
              </div>
            </div>
          </ScrollArea>
        </section>
      </Tabs>
    </div>

    <section class="mt-5 rounded-2xl border bg-card p-5">
      <div class="flex items-center gap-2">
        <History :size="16" />
        <h2 class="text-sm font-semibold">本次会话运行历史</h2>
        <Badge variant="outline">{{ history.length }}</Badge>
      </div>
      <div v-if="history.length" class="mt-3 grid gap-2 md:grid-cols-2">
        <div
          v-for="run in history"
          :key="run.id"
          class="flex items-center gap-3 rounded-xl border p-3"
        >
          <div class="min-w-0 flex-1">
            <p class="truncate text-sm font-medium">
              {{ run.character }} {{ run.revision }}
            </p>
            <p class="text-xs text-muted-foreground">
              {{ new Date(run.createdAt).toLocaleTimeString() }}
              · {{ (run.durationMs / 1000).toFixed(2) }}s ·
              {{ run.terminal?.type ?? 'unknown' }}
            </p>
          </div>
          <Button size="sm" variant="outline" @click="compareRun = run; activeTab = 'response'">
            对比
          </Button>
        </div>
      </div>
      <p v-else class="mt-3 text-sm text-muted-foreground">
        完成或终止一次生成后会记录配置和结果，最多保留 20 次。
      </p>
    </section>
  </div>
</template>
