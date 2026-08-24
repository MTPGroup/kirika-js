<script setup lang="ts">
import {
  Cpu,
  Gauge,
  MoreVertical,
  Pencil,
  Plus,
  RefreshCw,
  Save,
  Settings2,
  Trash2,
  X,
  Zap,
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
import { Switch } from '@renderer/components/ui/switch'
import { api, type ProviderDto } from '@renderer/services/api'
import { useStudioStore } from '@renderer/stores/studio'
import { computed, onMounted, reactive, ref } from 'vue'

const studio = useStudioStore()

const providers = computed(() => studio.providers)
onMounted(() => studio.execute(studio.refreshResources))
const sheetOpen = ref(false)
const editing = ref<ProviderDto | null>(null)
const pendingDelete = ref<ProviderDto | null>(null)
const deleteDialogOpen = computed({
  get: () => pendingDelete.value !== null,
  set: (open: boolean) => {
    if (!open) pendingDelete.value = null
  },
})

const form = reactive({
  name: '',
  baseUrl: '',
  apiKey: '',
  defaultModel: '',
  temperature: '0.7',
  topP: '0.9',
  maxOutputTokens: '2048',
  seed: '',
  stream: true,
  useLorebook: true,
  saveHistory: true,
  enabled: true,
})

const buildForm = () => ({
  name: '',
  baseUrl: '',
  apiKey: '',
  defaultModel: '',
  temperature: '0.7',
  topP: '0.9',
  maxOutputTokens: '2048',
  seed: '',
  stream: true,
  useLorebook: true,
  saveHistory: true,
  enabled: true,
})

function openNew() {
  editing.value = null
  Object.assign(form, buildForm())
  sheetOpen.value = true
}

function openEdit(provider: ProviderDto) {
  editing.value = provider
  Object.assign(form, {
    name: provider.name,
    baseUrl: provider.baseUrl,
    apiKey: '',
    defaultModel: provider.defaultModel,
    temperature: String(provider.generation.temperature ?? 0.7),
    topP: String(provider.generation.topP ?? 0.9),
    maxOutputTokens:
      provider.generation.maxOutputTokens != null
        ? String(provider.generation.maxOutputTokens)
        : '',
    seed:
      provider.generation.seed != null ? String(provider.generation.seed) : '',
    stream: true,
    useLorebook: true,
    saveHistory: true,
    enabled: provider.enabled ?? true,
  })
  sheetOpen.value = true
}

async function save() {
  await studio.execute(async () => {
    await api.saveProvider({
      id: editing.value?.id,
      name: form.name.trim(),
      baseUrl: form.baseUrl.trim(),
      apiKey: form.apiKey.trim() || undefined,
      defaultModel: form.defaultModel.trim(),
      generation: {
        temperature: Number(form.temperature),
        topP: Number(form.topP),
        maxOutputTokens: form.maxOutputTokens
          ? Number(form.maxOutputTokens)
          : undefined,
        seed: form.seed ? Number(form.seed) : undefined,
      },
      enabled: form.enabled,
    })
    await studio.refreshResources()
    sheetOpen.value = false
  })
}

async function toggleEnabled(provider: ProviderDto) {
  await studio.execute(async () => {
    await api.saveProvider({
      id: provider.id,
      name: provider.name,
      baseUrl: provider.baseUrl,
      defaultModel: provider.defaultModel,
      generation: provider.generation,
      enabled: !provider.enabled,
    })
    await studio.refreshResources()
  })
}

function requestRemove(provider: ProviderDto) {
  pendingDelete.value = provider
}

async function confirmRemove() {
  if (!pendingDelete.value) return
  const id = pendingDelete.value.id
  await studio.execute(async () => {
    await api.deleteProvider({ id })
    await studio.refreshResources()
    pendingDelete.value = null
  })
}

const enabledCount = computed(
  () => providers.value.filter((p) => p.enabled).length,
)
</script>

<template>
  <div class="mx-auto w-full max-w-280 px-6 py-7 lg:px-8">
    <PageHeader
      eyebrow="Models"
      title="模型"
      description="配置 OpenAI 兼容接口的模型、采样参数与启用状态。"
    >
      <template #actions>
        <span class="text-muted-foreground mr-1 hidden text-xs sm:inline"
          >{{ enabledCount }}
          / {{ providers.length }} 已启用</span
        >
        <Button @click="openNew">
          <Plus :size="15" />
          添加模型
        </Button>
      </template>
    </PageHeader>

    <div
      v-if="providers.length"
      class="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-2"
    >
      <div
        v-for="provider in providers"
        :key="provider.id"
        class="group relative flex flex-col rounded-2xl border border-border bg-card p-5 transition-colors hover:border-border/80"
      >
        <div class="flex items-start justify-between gap-3">
          <div class="flex min-w-0 items-center gap-3">
            <div
              class="flex size-10 shrink-0 items-center justify-center rounded-xl bg-muted text-muted-foreground"
            >
              <Cpu :size="18" :stroke-width="1.75" />
            </div>
            <div class="min-w-0">
              <p class="text-foreground truncate font-medium">
                {{ provider.name }}
              </p>
              <p class="text-muted-foreground mt-0.5 truncate text-xs">
                {{ provider.baseUrl }}
              </p>
            </div>
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger as-child>
              <Button
                variant="ghost"
                size="icon-sm"
                class="text-muted-foreground opacity-100 transition-opacity sm:opacity-0 sm:group-hover:opacity-100 focus:opacity-100"
                :aria-label="`${provider.name} 的更多操作`"
              >
                <MoreVertical :size="16" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" class="w-40">
              <DropdownMenuLabel>操作</DropdownMenuLabel>
              <DropdownMenuItem @select="openEdit(provider)"
                ><Pencil :size="14" />编辑</DropdownMenuItem
              >
              <DropdownMenuSeparator />
              <DropdownMenuItem
                variant="destructive"
                @select="requestRemove(provider)"
                ><Trash2 :size="14" />删除</DropdownMenuItem
              >
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <div class="mt-4 flex flex-wrap items-center gap-2">
          <Badge variant="outline" class="gap-1.5">
            <Zap :size="12" />
            {{ provider.defaultModel }}
          </Badge>
          <Badge variant="soft" class="gap-1">
            <Gauge :size="12" />
            T {{ provider.generation.temperature ?? "—" }}
          </Badge>
          <Badge
            v-if="provider.generation.maxOutputTokens"
            variant="soft"
            class="gap-1"
          >
            {{ provider.generation.maxOutputTokens }}
            tok
          </Badge>
        </div>

        <div
          class="mt-4 flex items-center justify-between border-t border-border/70 pt-4"
        >
          <span class="text-muted-foreground flex items-center gap-1.5 text-xs">
            <span
              :class="provider.enabled ? 'bg-success shadow-[0_0_6px_var(--success)]' : 'bg-muted-foreground/40'"
              class="size-2 rounded-full"
            />
            {{ provider.enabled ? '已启用' : '已停用' }}
          </span>
          <Button
            variant="ghost"
            size="sm"
            class="gap-1.5 text-xs"
            @click="toggleEnabled(provider)"
          >
            <RefreshCw :size="13" />
            {{ provider.enabled ? '停用' : '启用' }}
          </Button>
        </div>
      </div>
    </div>

    <div v-else class="mt-6">
      <EmptyState
        :icon="Settings2"
        title="还没有模型"
        description="添加一个 OpenAI 兼容接口，开始让角色回应你。"
      >
        <Button @click="openNew">
          <Plus :size="15" />
          添加模型
        </Button>
      </EmptyState>
    </div>

    <AlertDialog v-model:open="deleteDialogOpen">
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>删除 {{ pendingDelete?.name }}？</AlertDialogTitle>
          <AlertDialogDescription
            >该模型配置将被移除，此操作无法撤销。</AlertDialogDescription
          >
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel @click="pendingDelete = null"
            >取消</AlertDialogCancel
          >
          <AlertDialogAction @click="confirmRemove">确认删除</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>

    <!-- Provider editor sheet -->
    <Sheet v-model:open="sheetOpen">
      <SheetContent side="right" class="w-full sm:max-w-md">
        <SheetHeader>
          <SheetTitle>{{ editing ? '编辑模型' : '添加模型' }}</SheetTitle>
          <SheetDescription>配置连接与默认采样参数。</SheetDescription>
        </SheetHeader>

        <form
          id="provider-form"
          class="flex min-h-0 flex-1 flex-col gap-5 px-4 pb-4"
          @submit.prevent="save"
        >
          <div class="space-y-4">
            <div class="space-y-1.5">
              <label for="pf-name" class="text-sm font-medium">显示名称</label>
              <Input
                id="pf-name"
                v-model="form.name"
                placeholder="例如 DeepSeek"
              />
            </div>
            <div class="space-y-1.5">
              <label for="pf-url" class="text-sm font-medium">Base URL</label>
              <Input
                id="pf-url"
                v-model="form.baseUrl"
                placeholder="https://api.example.com/v1"
              />
            </div>
            <div class="space-y-1.5">
              <label for="pf-key" class="text-sm font-medium">API Key</label>
              <Input
                id="pf-key"
                v-model="form.apiKey"
                type="password"
                placeholder="sk-…"
              />
            </div>
            <div class="space-y-1.5">
              <label for="pf-model" class="text-sm font-medium">默认模型</label>
              <Input
                id="pf-model"
                v-model="form.defaultModel"
                placeholder="deepseek-chat"
              />
            </div>
            <div class="grid grid-cols-2 gap-3">
              <div class="space-y-1.5">
                <label for="pf-temp" class="text-sm font-medium"
                  >Temperature</label
                >
                <Input
                  id="pf-temp"
                  v-model="form.temperature"
                  type="number"
                  min="0"
                  max="2"
                  step="0.1"
                  placeholder="0.7"
                />
              </div>
              <div class="space-y-1.5">
                <label for="pf-topp" class="text-sm font-medium">Top P</label>
                <Input
                  id="pf-topp"
                  v-model="form.topP"
                  type="number"
                  min="0"
                  max="1"
                  step="0.05"
                  placeholder="0.9"
                />
              </div>
              <div class="space-y-1.5">
                <label for="pf-max" class="text-sm font-medium"
                  >Max Tokens</label
                >
                <Input
                  id="pf-max"
                  v-model="form.maxOutputTokens"
                  type="number"
                  min="1"
                  step="1"
                  placeholder="2048"
                />
              </div>
              <div class="space-y-1.5">
                <label for="pf-seed" class="text-sm font-medium">Seed</label>
                <Input
                  id="pf-seed"
                  v-model="form.seed"
                  type="number"
                  step="1"
                  placeholder="可选"
                />
              </div>
            </div>

            <div class="rounded-xl border border-border p-3">
              <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div class="flex items-center justify-between gap-3">
                  <span class="text-sm">流式输出</span>
                  <Switch
                    id="pf-stream"
                    v-model="form.stream"
                    aria-label="流式输出"
                  />
                </div>
                <div class="flex items-center justify-between gap-3">
                  <span class="text-sm">使用世界书</span>
                  <Switch
                    id="pf-lorebook"
                    v-model="form.useLorebook"
                    aria-label="使用世界书"
                  />
                </div>
                <div class="flex items-center justify-between gap-3">
                  <span class="text-sm">保存历史</span>
                  <Switch
                    id="pf-history"
                    v-model="form.saveHistory"
                    aria-label="保存历史"
                  />
                </div>
                <div class="flex items-center justify-between gap-3">
                  <span class="text-sm">启用</span>
                  <Switch
                    id="pf-enabled"
                    v-model="form.enabled"
                    aria-label="启用"
                  />
                </div>
              </div>
            </div>
          </div>
        </form>

        <SheetFooter class="border-t">
          <Button variant="ghost" @click="sheetOpen = false">
            <X :size="15" />
            取消
          </Button>
          <Button type="submit" form="provider-form">
            <Save :size="15" />
            保存
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  </div>
</template>
