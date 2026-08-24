<script setup lang="ts">
import {
  Activity,
  BarChart3,
  Bot,
  Code2,
  FileText,
  History,
  Loader2,
  Play,
  RotateCcw,
  Sparkles,
  Terminal,
  Wand2,
} from '@lucide/vue'
import PageHeader from '@renderer/components/layout/PageHeader.vue'
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from '@renderer/components/ui/avatar'
import { Badge } from '@renderer/components/ui/badge'
import { Button } from '@renderer/components/ui/button'
import { Input } from '@renderer/components/ui/input'
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
  demoCharacters,
  demoLorebooks,
  demoProviders,
} from '@renderer/lib/demo'
import { computed, ref } from 'vue'

type Tab = 'response' | 'prompt' | 'request' | 'metrics' | 'logs'

const activeTab = ref<Tab>('response')
const selectedCharacter = ref(demoCharacters[0]?.name ?? '')
const selectedModel = ref(demoProviders[0]?.name ?? '')
const selectedCharacterVersion = ref('draft')
const selectedLorebook = ref(demoLorebooks[1]?.name ?? '')
const selectedLorebookVersion = ref('draft')
const testInput = ref('你第一次在月光森林遇到她，请主动和她打招呼。')
const scenario = ref('初次见面')
const history = ref<
  {
    id: number
    label: string
    output: string
    time: string
    hits: number
    character: string
  }[]
>([])
const compareRun = ref<(typeof history.value)[number] | null>(null)
const scenarios = [
  { name: '初次见面', prompt: '你第一次在月光森林遇到她，请主动和她打招呼。' },
  { name: '触发世界观', prompt: '请告诉我月光森林中最不能触碰的禁忌。' },
  {
    name: '角色一致性',
    prompt: '面对陌生人的请求，你会如何回应？请保持角色口吻。',
  },
]
const hitEntries = [
  { name: '月光森林', keyword: '月光森林', tokens: 86, position: '角色设定后' },
  { name: '精灵族礼仪', keyword: '精灵', tokens: 54, position: '历史消息前' },
]
const temperature = ref('0.8')
const maxTokens = ref('1024')
const useLorebook = ref(true)
const conversationMode = ref(true)
const conversationInput = ref('你愿意带我去看看森林深处吗？')
const localProfile = ref({
  name: localStorage.getItem('kirika-profile-name') || '我',
  avatar: localStorage.getItem('kirika-profile-avatar') || '',
})
const messages = ref<{ role: 'user' | 'assistant'; content: string }[]>([])
const running = ref(false)
const output = ref('')
const logs = ref<string[]>([])
const metrics = ref<{ tokens: string; time: string; rate: string }>({
  tokens: '0',
  time: '—',
  rate: '—',
})

const sampleResponse =
  '月光穿过交错的枝叶，落在林间小径上。她在几步之外停下，回头看你，' +
  '眼睛里映着细碎的银光。\n\n「你终于来了，」她轻声说，声音像夜风拂过琴弦。「别怕，这条路上只有我们。」\n\n她伸出手，指尖停在你面前一寸的地方，等待你的回应。'

let timer: number | null = null

function start() {
  if (running.value) return
  if (conversationMode.value) {
    const text =
      messages.value.length === 0
        ? testInput.value.trim()
        : conversationInput.value.trim()
    if (!text) return
    messages.value.push({ role: 'user', content: text })
  }
  running.value = true
  output.value = ''
  logs.value = [
    '[12:00:01] 开始生成…',
    `[12:00:01] 已解析角色：${selectedCharacter.value}`,
    '[12:00:01] 使用模型：' +
      selectedModel.value +
      ' · ' +
      (useLorebook.value ? '世界书已注入' : '未启用世界书'),
  ]
  metrics.value = { tokens: '0', time: '0.0s', rate: '—' }

  const chars = Array.from(sampleResponse)
  let i = 0
  let count = 0
  const startedAt = Date.now()

  timer = window.setInterval(() => {
    const chunk = chars.slice(i, i + 3).join('')
    i += 3
    if (chunk) output.value += chunk
    count += 3
    const elapsed = (Date.now() - startedAt) / 1000
    metrics.value = {
      tokens: String(count),
      time: `${elapsed.toFixed(1)}s`,
      rate: `${(count / Math.max(elapsed, 1)).toFixed(1)} tok/s`,
    }

    if (count % 24 === 0) {
      logs.value.push(
        `[12:00:0${Math.floor(count / 24)}] 流式输出 ${count} tokens`,
      )
    }

    if (i >= chars.length) {
      stopTimer()
      running.value = false
      logs.value.push('[12:00:02] 生成完成 · finish_reason=stop')
      if (conversationMode.value) {
        messages.value.push({ role: 'assistant', content: output.value })
        conversationInput.value = ''
      }
      saveRun()
    }
  }, 40)
}

function stopTimer() {
  if (timer != null) {
    window.clearInterval(timer)
    timer = null
  }
}

function stop() {
  stopTimer()
  running.value = false
  logs.value.push('[手动] 已停止生成')
}

const tabs: { id: Tab; label: string; icon: unknown }[] = [
  { id: 'response', label: '响应', icon: FileText },
  { id: 'prompt', label: 'Prompt', icon: Wand2 },
  { id: 'request', label: '请求', icon: Code2 },
  { id: 'metrics', label: '指标', icon: BarChart3 },
  { id: 'logs', label: '日志', icon: Terminal },
]

const runningLabel = computed(() => (running.value ? '停止' : '运行生成'))
const versionLabel = computed(
  () =>
    `角色 ${selectedCharacterVersion.value === 'draft' ? '草稿' : '已发布'} · 世界书 ${selectedLorebookVersion.value === 'draft' ? '草稿' : '已发布'}`,
)
function chooseScenario(value: unknown) {
  if (typeof value !== 'string') return
  scenario.value = value
  testInput.value = scenarios.find((item) => item.name === value)?.prompt ?? ''
}
function saveRun() {
  if (!output.value) return
  history.value.unshift({
    id: Date.now(),
    label: scenario.value,
    output: output.value,
    time: new Date().toLocaleTimeString(),
    hits: useLorebook.value ? hitEntries.length : 0,
    character: selectedCharacter.value,
  })
  history.value = history.value.slice(0, 8)
}
function loadRun(run: (typeof history.value)[number]) {
  output.value = run.output
  compareRun.value = run
  activeTab.value = 'response'
}
function resetInput() {
  chooseScenario('初次见面')
}
function clearConversation() {
  messages.value = []
  conversationInput.value = ''
  output.value = ''
  compareRun.value = null
  logs.value.push('[会话] 已清空上下文')
}
</script>

<template>
  <div class="mx-auto w-full max-w-280 px-6 py-7 lg:px-8">
    <PageHeader
      eyebrow="Tests"
      title="生成预览"
      description="用真实角色与模型跑一次流式生成，检查提示词、命中与输出质量。"
    >
      <template #actions>
        <Button
          :variant="running ? 'outline' : 'default'"
          @click="running ? stop() : start()"
        >
          <Loader2 v-if="running" :size="15" class="animate-spin" />
          <Play v-else :size="15" />
          {{ runningLabel }}
        </Button>
      </template>
    </PageHeader>

    <div class="mt-6 grid grid-cols-1 gap-5 lg:grid-cols-5">
      <!-- Config -->
      <aside class="space-y-4 lg:col-span-2">
        <div class="rounded-2xl border border-border bg-card p-5">
          <div class="flex items-center justify-between">
            <h2 class="text-foreground text-sm font-semibold">生成配置</h2>
            <Badge variant="outline">{{ versionLabel }}</Badge>
          </div>
          <div class="mt-4 space-y-4">
            <div class="space-y-2">
              <div class="flex items-center justify-between">
                <label for="test-input" class="text-sm font-medium"
                  >测试场景</label
                ><Button
                  variant="ghost"
                  size="icon-sm"
                  aria-label="重置测试输入"
                  @click="resetInput"
                  ><RotateCcw :size="14" /></Button
                >
              </div>
              <Select
                :model-value="scenario"
                @update:model-value="chooseScenario"
                ><SelectTrigger
                  ><SelectValue placeholder="选择场景" /></SelectTrigger
                ><SelectContent
                  ><SelectItem
                    v-for="item in scenarios"
                    :key="item.name"
                    :value="item.name"
                    >{{ item.name }}</SelectItem
                  ></SelectContent
                ></Select
              ><Textarea
                id="test-input"
                v-model="testInput"
                class="min-h-24"
                placeholder="输入测试消息或场景…"
              />
            </div>
            <div class="space-y-1.5">
              <label for="t-char" class="text-sm font-medium">角色</label>
              <Select v-model="selectedCharacter">
                <SelectTrigger id="t-char"
                  ><SelectValue placeholder="选择角色" /></SelectTrigger
                >
                <SelectContent>
                  <SelectItem
                    v-for="chr in demoCharacters"
                    :key="chr.id"
                    :value="chr.name"
                    >{{ chr.name }}</SelectItem
                  >
                </SelectContent>
              </Select>
            </div>
            <div class="space-y-1.5">
              <label for="t-lore" class="text-sm font-medium">世界书</label
              ><Select v-model="selectedLorebook"
                ><SelectTrigger id="t-lore"
                  ><SelectValue placeholder="选择世界书" /></SelectTrigger
                ><SelectContent
                  ><SelectItem
                    v-for="book in demoLorebooks"
                    :key="book.id"
                    :value="book.name"
                    >{{ book.name }}</SelectItem
                  ></SelectContent
                ></Select
              >
            </div>
            <div class="grid grid-cols-2 gap-2">
              <Select v-model="selectedCharacterVersion"
                ><SelectTrigger><SelectValue /></SelectTrigger
                ><SelectContent
                  ><SelectItem value="draft">角色草稿</SelectItem
                  ><SelectItem value="published"
                    >已发布角色</SelectItem
                  ></SelectContent
                ></Select
              ><Select v-model="selectedLorebookVersion"
                ><SelectTrigger><SelectValue /></SelectTrigger
                ><SelectContent
                  ><SelectItem value="draft">世界书草稿</SelectItem
                  ><SelectItem value="published"
                    >已发布世界书</SelectItem
                  ></SelectContent
                ></Select
              >
            </div>
            <div class="space-y-1.5">
              <label for="t-model" class="text-sm font-medium">模型</label>
              <Select v-model="selectedModel">
                <SelectTrigger id="t-model"
                  ><SelectValue placeholder="选择模型" /></SelectTrigger
                >
                <SelectContent>
                  <SelectItem
                    v-for="p in demoProviders"
                    :key="p.id"
                    :value="p.name"
                    >{{ p.name }}</SelectItem
                  >
                </SelectContent>
              </Select>
            </div>
            <div class="grid grid-cols-2 gap-3">
              <div class="space-y-1.5">
                <label for="t-temp" class="text-sm font-medium"
                  >Temperature</label
                >
                <Input
                  id="t-temp"
                  v-model="temperature"
                  type="number"
                  min="0"
                  max="2"
                  step="0.1"
                />
              </div>
              <div class="space-y-1.5">
                <label for="t-max" class="text-sm font-medium"
                  >Max Tokens</label
                >
                <Input
                  id="t-max"
                  v-model="maxTokens"
                  type="number"
                  min="1"
                  step="1"
                />
              </div>
            </div>
            <div class="rounded-xl border border-border p-3 space-y-3">
              <div class="flex items-center justify-between gap-3">
                <span class="text-sm font-medium">注入世界书</span>
                <Switch v-model="useLorebook" aria-label="注入世界书" />
              </div>
              <div class="flex items-center justify-between gap-3">
                <div>
                  <p class="text-sm font-medium">连续对话</p>
                  <p class="text-xs text-muted-foreground">
                    保留上下文测试多轮一致性
                  </p>
                </div>
                <Switch v-model="conversationMode" aria-label="连续对话" />
              </div>
            </div>
          </div>
        </div>

        <div class="rounded-2xl border border-border bg-card p-5">
          <div class="flex items-center gap-2">
            <Bot :size="16" class="text-muted-foreground" />
            <span class="text-foreground text-sm font-semibold">本次运行</span>
          </div>
          <div class="mt-3 grid grid-cols-3 gap-3">
            <div class="rounded-xl bg-muted/60 p-3 text-center">
              <p class="text-muted-foreground text-[11px]">Tokens</p>
              <p
                class="text-foreground mt-1 text-lg font-semibold tabular-nums"
              >
                {{ metrics.tokens }}
              </p>
            </div>
            <div class="rounded-xl bg-muted/60 p-3 text-center">
              <p class="text-muted-foreground text-[11px]">耗时</p>
              <p
                class="text-foreground mt-1 text-lg font-semibold tabular-nums"
              >
                {{ metrics.time }}
              </p>
            </div>
            <div class="rounded-xl bg-muted/60 p-3 text-center">
              <p class="text-muted-foreground text-[11px]">速率</p>
              <p
                class="text-foreground mt-1 text-lg font-semibold tabular-nums"
              >
                {{ metrics.rate }}
              </p>
            </div>
          </div>
        </div>
      </aside>

      <!-- Output -->
      <Tabs v-model="activeTab" class="lg:col-span-3">
        <section
          class="flex min-h-120 flex-col rounded-2xl border border-border bg-card"
        >
          <div class="flex items-center gap-1 border-b border-border/70 p-1.5">
            <TabsList class="bg-transparent h-auto gap-1 p-0">
              <TabsTrigger v-for="tab in tabs" :key="tab.id" :value="tab.id">
                <component :is="tab.icon" :size="14" />
                {{ tab.label }}
              </TabsTrigger>
            </TabsList>
            <div class="ml-auto flex items-center gap-2 px-2">
              <Badge :variant="running ? 'default' : 'success'" class="gap-1.5">
                <Activity v-if="running" :size="12" class="animate-pulse" />
                <Sparkles v-else :size="12" />
                {{ running ? '生成中' : '就绪' }}
              </Badge>
            </div>
          </div>

          <div class="min-h-0 flex-1 overflow-y-auto p-5">
            <!-- Response -->
            <div v-if="activeTab === 'response'" class="space-y-4">
              <div
                v-if="!output && !running"
                class="text-muted-foreground flex min-h-80 items-center justify-center text-sm"
              >
                <div class="flex flex-col items-center gap-2 text-center">
                  <Sparkles :size="22" />
                  <span>点击「运行生成」查看流式输出</span>
                </div>
              </div>
              <div v-else class="space-y-3">
                <div
                  v-if="conversationMode && messages.length"
                  class="space-y-3"
                >
                  <div class="flex items-center justify-between">
                    <span class="text-xs font-semibold"
                      >对话上下文 · {{ messages.length }} 条消息</span
                    ><Button
                      variant="ghost"
                      size="sm"
                      @click="clearConversation"
                      >清空</Button
                    >
                  </div>
                  <div
                    v-for="(message, index) in messages"
                    :key="index"
                    :class="message.role === 'user' ? 'justify-end' : 'justify-start'"
                    class="flex"
                  >
                    <div
                      class="flex max-w-[78%] flex-row items-start gap-2"
                      :class="message.role === 'user' ? 'flex-row-reverse' : 'flex-row'"
                    >
                      <Avatar class="size-8 shrink-0">
                        <AvatarImage
                          v-if="message.role === 'user' && localProfile.avatar"
                          :src="localProfile.avatar"
                          :alt="localProfile.name"
                        />
                        <AvatarFallback
                          >{{ (message.role === 'user' ? localProfile.name : selectedCharacter).slice(0, 1) }}</AvatarFallback
                        >
                      </Avatar>
                      <div
                        :class="message.role === 'user' ? 'bg-primary text-primary-foreground' : 'bg-muted'"
                        class="rounded-2xl px-4 py-3 text-sm shadow-sm"
                      >
                        <p class="whitespace-pre-wrap">{{ message.content }}</p>
                      </div>
                    </div>
                  </div>
                </div>
                <div
                  v-if="compareRun"
                  class="rounded-xl border border-dashed border-border p-3 text-xs"
                >
                  <div class="flex items-center justify-between">
                    <span class="font-semibold"
                      >对比结果 · {{ compareRun.time }}</span
                    ><Button
                      variant="ghost"
                      size="sm"
                      @click="compareRun = null"
                      >关闭</Button
                    >
                  </div>
                  <p class="mt-2 whitespace-pre-wrap text-muted-foreground">
                    {{ compareRun.output }}
                  </p>
                </div>
                <div v-if="running" class="flex justify-start">
                  <div class="flex max-w-[78%] flex-row items-start gap-2">
                    <Avatar class="size-8 shrink-0"
                      ><AvatarFallback
                        >{{ selectedCharacter.slice(0, 1) }}</AvatarFallback
                      ></Avatar
                    >
                    <div class="rounded-2xl bg-muted px-4 py-3 text-sm">
                      <p class="whitespace-pre-wrap">{{ output }}</p>
                    </div>
                  </div>
                </div>
                <div v-if="conversationMode && !running" class="space-y-2">
                  <Textarea
                    v-model="conversationInput"
                    class="min-h-20"
                    placeholder="继续输入下一轮消息…"
                    @keydown.enter.exact.prevent="start"
                  /><Button class="w-full" variant="outline" @click="start"
                    ><Play :size="14" />发送下一轮</Button
                  >
                </div>
                <div
                  v-if="running"
                  class="flex items-center gap-1.5 text-xs text-muted-foreground"
                >
                  <Loader2 :size="13" class="animate-spin" />
                  <span>正在生成…</span>
                </div>
              </div>
            </div>
            <!-- Prompt -->
            <div v-else-if="activeTab === 'prompt'" class="space-y-2">
              <div
                class="rounded-xl bg-muted/50 p-3 font-mono text-xs leading-relaxed text-foreground/90"
              >
                <p>
                  <span class="text-success">[system]</span>
                  你是{{ selectedCharacter }}，请用沉浸式中文扮演。……
                </p>
                <p class="mt-2">
                  <span class="text-primary">[user]</span> {{ testInput }}
                </p>
              </div>
              <div v-if="useLorebook" class="space-y-2">
                <p class="text-xs font-semibold">
                  世界书命中 · {{ hitEntries.length }} 条
                </p>
                <div
                  v-for="hit in hitEntries"
                  :key="hit.name"
                  class="flex items-center justify-between rounded-lg border border-border p-3 text-xs"
                >
                  <div>
                    <p class="font-medium">✓ {{ hit.name }}</p>
                    <p class="text-muted-foreground">
                      关键词：{{ hit.keyword }}
                      · 注入：{{ hit.position }}
                    </p>
                  </div>
                  <Badge variant="outline">{{ hit.tokens }} tokens</Badge>
                </div>
              </div>
            </div>
            <!-- Request -->
            <div
              v-else-if="activeTab === 'request'"
              class="grid grid-cols-1 gap-4 md:grid-cols-2"
            >
              <div class="rounded-xl bg-muted/40 p-3">
                <p class="text-muted-foreground mb-1 text-xs font-medium">
                  Model
                </p>
                <p class="text-foreground text-sm">{{ selectedModel }}</p>
              </div>
              <div class="rounded-xl bg-muted/40 p-3">
                <p class="text-muted-foreground mb-1 text-xs font-medium">
                  参数
                </p>
                <p class="text-muted-foreground text-sm">
                  T {{ temperature }} · max {{ maxTokens }}
                </p>
              </div>
            </div>
            <!-- Metrics -->
            <div
              v-else-if="activeTab === 'metrics'"
              class="grid grid-cols-2 gap-3 md:grid-cols-3"
            >
              <div class="rounded-xl border border-border p-4">
                <p class="text-muted-foreground text-xs">生成 Tokens</p>
                <p
                  class="text-foreground mt-1 text-xl font-semibold tabular-nums"
                >
                  {{ metrics.tokens }}
                </p>
              </div>
              <div class="rounded-xl border border-border p-4">
                <p class="text-muted-foreground text-xs">耗时</p>
                <p
                  class="text-foreground mt-1 text-xl font-semibold tabular-nums"
                >
                  {{ metrics.time }}
                </p>
              </div>
              <div class="rounded-xl border border-border p-4">
                <p class="text-muted-foreground text-xs">吞吐</p>
                <p
                  class="text-foreground mt-1 text-xl font-semibold tabular-nums"
                >
                  {{ metrics.rate }}
                </p>
              </div>
              <div class="rounded-xl border border-border p-4">
                <p class="text-muted-foreground text-xs">Finish</p>
                <p
                  class="text-foreground mt-1 text-xl font-semibold tabular-nums"
                >
                  stop
                </p>
              </div>
            </div>
            <!-- Logs -->
            <div v-else class="space-y-1">
              <p
                v-for="(line, idx) in logs"
                :key="idx"
                class="text-muted-foreground font-mono text-xs"
              >
                {{ line }}
              </p>
              <p v-if="!logs.length" class="text-muted-foreground text-sm">
                暂无日志
              </p>
            </div>
          </div>
        </section>
      </Tabs>
    </div>
    <section class="mt-5 rounded-2xl border border-border bg-card p-5">
      <div class="flex items-center gap-2">
        <History :size="16" class="text-muted-foreground" />
        <h2 class="text-sm font-semibold">运行历史</h2>
        <Badge variant="outline">{{ history.length }}</Badge>
      </div>
      <div v-if="history.length" class="mt-3 grid gap-2 md:grid-cols-2">
        <div
          v-for="run in history"
          :key="run.id"
          class="flex items-center gap-3 rounded-xl border border-border p-3"
        >
          <div class="min-w-0 flex-1">
            <p class="truncate text-sm font-medium">{{ run.label }}</p>
            <p class="text-xs text-muted-foreground">
              {{ run.character ?? selectedCharacter }}
              · 命中 {{ run.hits }} 条 · {{ run.time }}
            </p>
          </div>
          <Button variant="outline" size="sm" @click="loadRun(run)">查看</Button
          ><Button variant="ghost" size="sm" @click="compareRun = run"
            >对比</Button
          >
        </div>
      </div>
      <p v-else class="mt-3 text-sm text-muted-foreground">
        运行完成后会自动保存结果，可用于回看和对比。
      </p>
    </section>
  </div>
</template>
