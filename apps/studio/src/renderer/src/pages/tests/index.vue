<script setup lang="ts">
import {
  Activity,
  BarChart3,
  Bot,
  Code2,
  FileText,
  Loader2,
  Play,
  Sparkles,
  Terminal,
  Wand2,
} from '@lucide/vue'
import PageHeader from '@renderer/components/layout/PageHeader.vue'
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
import { demoCharacters, demoProviders } from '@renderer/lib/demo'
import { computed, ref } from 'vue'

type Tab = 'response' | 'prompt' | 'request' | 'metrics' | 'logs'

const activeTab = ref<Tab>('response')
const selectedCharacter = ref(demoCharacters[0]?.name ?? '')
const selectedModel = ref(demoProviders[0]?.name ?? '')
const temperature = ref('0.8')
const maxTokens = ref('1024')
const useLorebook = ref(true)
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
          <h2 class="text-foreground text-sm font-semibold">生成配置</h2>
          <div class="mt-4 space-y-4">
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
            <div class="rounded-xl border border-border p-3">
              <div class="flex items-center justify-between gap-3">
                <span class="text-sm font-medium">注入世界书</span>
                <Switch v-model="useLorebook" aria-label="注入世界书" />
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
                <div class="flex items-center gap-2">
                  <div
                    class="flex size-7 items-center justify-center rounded-full bg-muted text-xs font-semibold text-muted-foreground"
                  >
                    {{ selectedCharacter.charAt(0) }}
                  </div>
                  <span class="text-foreground text-sm font-medium"
                    >{{ selectedCharacter }}</span
                  >
                  <span
                    v-if="running"
                    class="inline-block size-2 animate-pulse rounded-full bg-primary"
                  />
                </div>
                <div
                  class="text-foreground max-w-prose text-sm leading-relaxed whitespace-pre-wrap"
                >
                  {{ output }}
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
                  <span class="text-primary">[user]</span>
                  月光下的森林，你看到了谁？
                </p>
              </div>
              <p v-if="useLorebook" class="text-muted-foreground text-xs">
                已注入 2 条世界书命中
              </p>
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
  </div>
</template>
