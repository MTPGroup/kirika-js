<script setup lang="ts">
import {
  CheckCircle2,
  Cpu,
  Gauge,
  Loader2,
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
import {
  type ApiKeyUpdate,
  api,
  type ProviderDto,
  type ProviderModelDto,
  toIpcError,
} from '@renderer/services/api'
import { useStudioStore } from '@renderer/stores/studio'
import { computed, onMounted, reactive, ref } from 'vue'

const studio = useStudioStore()
const providers = computed(() => studio.providers)
const sheetOpen = ref(false)
const editing = ref<ProviderDto | null>(null)
const pendingDelete = ref<ProviderDto | null>(null)
const saving = ref(false)
const togglingProviderId = ref<string | null>(null)
const deleting = ref(false)
const pageError = ref('')
const probing = ref(false)
const loadingModels = ref(false)
const formError = ref('')
const connectionMessage = ref('')
const remoteModels = ref<readonly ProviderModelDto[]>([])

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
  clearApiKey: false,
  defaultModel: '',
  temperature: '0.7',
  topP: '0.9',
  maxOutputTokens: '2048',
  seed: '',
  enabled: true,
})

onMounted(() => studio.execute(studio.refreshProviders))

function resetFeedback() {
  formError.value = ''
  connectionMessage.value = ''
  remoteModels.value = []
}

function openNew() {
  editing.value = null
  Object.assign(form, {
    name: '',
    baseUrl: '',
    apiKey: '',
    clearApiKey: false,
    defaultModel: '',
    temperature: '0.7',
    topP: '0.9',
    maxOutputTokens: '2048',
    seed: '',
    enabled: true,
  })
  resetFeedback()
  sheetOpen.value = true
}

function openEdit(provider: ProviderDto) {
  editing.value = provider
  Object.assign(form, {
    name: provider.name,
    baseUrl: provider.baseUrl,
    apiKey: '',
    clearApiKey: false,
    defaultModel: provider.defaultModel,
    temperature: String(provider.generation.temperature ?? 0.7),
    topP: String(provider.generation.topP ?? 0.9),
    maxOutputTokens:
      provider.generation.maxOutputTokens == null
        ? ''
        : String(provider.generation.maxOutputTokens),
    seed: provider.generation.seed == null ? '' : String(provider.generation.seed),
    enabled: provider.enabled,
  })
  resetFeedback()
  sheetOpen.value = true
}

function apiKeyUpdate(): ApiKeyUpdate {
  if (form.clearApiKey) return { action: 'clear' }
  const value = form.apiKey.trim()
  if (value) return { action: 'replace', value }
  return editing.value ? { action: 'retain' } : { action: 'clear' }
}

function parseNumber(
  value: string,
  label: string,
  options: { min?: number; max?: number; integer?: boolean } = {},
): number | undefined {
  if (!value.trim()) return undefined
  const parsed = Number(value)
  if (!Number.isFinite(parsed)) throw new Error(`${label} 必须是有效数字`)
  if (options.integer && !Number.isInteger(parsed)) throw new Error(`${label} 必须是整数`)
  if (options.min != null && parsed < options.min)
    throw new Error(`${label} 不能小于 ${options.min}`)
  if (options.max != null && parsed > options.max)
    throw new Error(`${label} 不能大于 ${options.max}`)
  return parsed
}

function validateConnection(requireModel = false) {
  if (!form.name.trim()) throw new Error('请输入显示名称')
  const url = new URL(form.baseUrl.trim())
  if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password)
    throw new Error('Base URL 必须是无用户凭据的 HTTP 或 HTTPS 地址')
  if (requireModel && !form.defaultModel.trim()) throw new Error('请输入默认模型')
}

function buildGeneration() {
  return {
    temperature: parseNumber(form.temperature, 'Temperature', {
      min: 0,
      max: 2,
    }),
    topP: parseNumber(form.topP, 'Top P', { min: 0, max: 1 }),
    maxOutputTokens: parseNumber(form.maxOutputTokens, 'Max Tokens', {
      min: 1,
      integer: true,
    }),
    seed: parseNumber(form.seed, 'Seed', { integer: true }),
  }
}

function connectionInput() {
  validateConnection()
  return {
    providerId: editing.value?.id,
    baseUrl: form.baseUrl.trim(),
    apiKey: apiKeyUpdate(),
    model: form.defaultModel.trim(),
  }
}

async function save() {
  formError.value = ''
  try {
    validateConnection(true)
    saving.value = true
    await api.saveProvider({
      id: editing.value?.id,
      type: 'openai-compatible',
      name: form.name.trim(),
      baseUrl: form.baseUrl.trim(),
      apiKey: apiKeyUpdate(),
      defaultModel: form.defaultModel.trim(),
      generation: buildGeneration(),
      enabled: form.enabled,
    })
    await studio.refreshProviders()
    sheetOpen.value = false
  } catch (error) {
    formError.value = toIpcError(error).message
  } finally {
    saving.value = false
  }
}

async function loadModels() {
  formError.value = ''
  connectionMessage.value = ''
  try {
    loadingModels.value = true
    const result = await api.listProviderModels(connectionInput())
    remoteModels.value = result.models
    connectionMessage.value = result.models.length
      ? `已加载 ${result.models.length} 个模型`
      : '连接成功，但服务没有返回模型；你仍可手动输入模型 ID。'
  } catch (error) {
    formError.value = `${toIpcError(error).message}。若服务不支持 /models，请手动输入模型 ID。`
  } finally {
    loadingModels.value = false
  }
}

async function testConnection() {
  formError.value = ''
  connectionMessage.value = ''
  try {
    probing.value = true
    const result = await api.testProviderConnection(connectionInput())
    connectionMessage.value = result.message
  } catch (error) {
    formError.value = `${toIpcError(error).message}。若服务不支持 /models，请保存后在功能测试页验证生成。`
  } finally {
    probing.value = false
  }
}

async function toggleEnabled(provider: ProviderDto) {
  pageError.value = ''
  togglingProviderId.value = provider.id
  try {
    const generation = {
      maxOutputTokens: provider.generation.maxOutputTokens,
      temperature: provider.generation.temperature,
      topP: provider.generation.topP,
      stopSequences: provider.generation.stopSequences
        ? [...provider.generation.stopSequences]
        : undefined,
      seed: provider.generation.seed,
    }
    await api.saveProvider({
      id: provider.id,
      type: provider.type,
      name: provider.name,
      baseUrl: provider.baseUrl,
      apiKey: { action: 'retain' },
      defaultModel: provider.defaultModel,
      generation,
      enabled: !provider.enabled,
    })
    await studio.refreshProviders()
  } catch (error) {
    pageError.value = toIpcError(error).message
  } finally {
    togglingProviderId.value = null
  }
}

function requestRemove(provider: ProviderDto) {
  pendingDelete.value = provider
}

async function confirmRemove() {
  if (!pendingDelete.value) return
  const id = pendingDelete.value.id
  pageError.value = ''
  deleting.value = true
  try {
    await api.deleteProvider({ id })
    await studio.refreshProviders()
    pendingDelete.value = null
  } catch (error) {
    pageError.value = toIpcError(error).message
  } finally {
    deleting.value = false
  }
}

const enabledCount = computed(() => providers.value.filter((provider) => provider.enabled).length)
</script>

<template>
  <div class="mx-auto w-full max-w-280 px-6 py-7 lg:px-8">
    <PageHeader
      eyebrow="Models"
      title="模型"
      description="配置 OpenAI 兼容接口的模型、凭据与默认采样参数。"
    >
      <template #actions>
        <span class="text-muted-foreground mr-1 hidden text-xs sm:inline">
          {{ enabledCount }}
          / {{ providers.length }} 已启用
        </span>
        <Button @click="openNew"><Plus :size="15" />添加模型</Button>
      </template>
    </PageHeader>

    <p
      v-if="pageError"
      class="mt-5 rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive"
    >
      {{ pageError }}
    </p>

    <div v-if="providers.length" class="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
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
              <p class="truncate font-medium text-foreground">
                {{ provider.name }}
              </p>
              <p class="mt-0.5 truncate text-xs text-muted-foreground">
                {{ provider.baseUrl }}
              </p>
            </div>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger as-child>
              <Button variant="ghost" size="icon-sm" :aria-label="`${provider.name} 的更多操作`">
                <MoreVertical :size="16" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" class="w-40">
              <DropdownMenuLabel>操作</DropdownMenuLabel>
              <DropdownMenuItem @select="openEdit(provider)">
                <Pencil :size="14" />编辑
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem variant="destructive" @select="requestRemove(provider)">
                <Trash2 :size="14" />删除
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        <div class="mt-4 flex flex-wrap items-center gap-2">
          <Badge variant="outline" class="gap-1.5">
            <Zap :size="12" />{{ provider.defaultModel }}
          </Badge>
          <Badge variant="soft" class="gap-1">
            <Gauge :size="12" />T{{ provider.generation.temperature ?? '—' }}
          </Badge>
          <Badge variant="soft">{{ provider.hasApiKey ? '凭据已加密' : '无凭据' }}</Badge>
        </div>
        <div class="mt-4 flex items-center justify-between border-t border-border/70 pt-4">
          <span class="flex items-center gap-1.5 text-xs text-muted-foreground">
            <span
              :class="provider.enabled ? 'bg-success' : 'bg-muted-foreground/40'"
              class="size-2 rounded-full"
            />
            {{ provider.enabled ? '已启用' : '已停用' }}
          </span>
          <Button
            variant="ghost"
            size="sm"
            class="gap-1.5 text-xs"
            :disabled="togglingProviderId === provider.id"
            @click="toggleEnabled(provider)"
          >
            <Loader2 v-if="togglingProviderId === provider.id" class="animate-spin" :size="13" />
            <RefreshCw v-else :size="13" />
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
        <Button @click="openNew"><Plus :size="15" />添加模型</Button>
      </EmptyState>
    </div>

    <AlertDialog v-model:open="deleteDialogOpen">
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>删除 {{ pendingDelete?.name }}？</AlertDialogTitle>
          <AlertDialogDescription>
            模型配置和本机加密凭据都会被删除，此操作无法撤销。
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel :disabled="deleting" @click="pendingDelete = null">
            取消
          </AlertDialogCancel>
          <Button type="button" variant="destructive" :disabled="deleting" @click="confirmRemove">
            <Loader2 v-if="deleting" class="animate-spin" :size="15" />
            {{ deleting ? '删除中…' : '确认删除' }}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>

    <Sheet v-model:open="sheetOpen">
      <SheetContent side="right" class="w-full overflow-y-auto sm:max-w-lg">
        <SheetHeader>
          <SheetTitle>{{ editing ? '编辑模型' : '添加模型' }}</SheetTitle>
          <SheetDescription>
            凭据使用操作系统安全存储加密，工作区文件不会保存明文 API Key。
          </SheetDescription>
        </SheetHeader>
        <form
          id="provider-form"
          class="flex flex-1 flex-col gap-5 px-4 pb-4"
          @submit.prevent="save"
        >
          <div class="space-y-4">
            <div class="space-y-1.5">
              <label for="pf-name" class="text-sm font-medium">显示名称</label>
              <Input id="pf-name" v-model="form.name" placeholder="例如 DeepSeek" />
            </div>
            <div class="space-y-1.5">
              <label for="pf-url" class="text-sm font-medium">Base URL</label>
              <Input id="pf-url" v-model="form.baseUrl" placeholder="https://api.example.com/v1" />
              <p v-if="form.baseUrl.startsWith('http://')" class="text-xs text-amber-600">
                非 HTTPS 连接会明文传输请求，仅建议用于本机服务。
              </p>
            </div>
            <div class="space-y-1.5">
              <label for="pf-key" class="text-sm font-medium">API Key</label>
              <Input
                id="pf-key"
                v-model="form.apiKey"
                type="password"
                :disabled="form.clearApiKey"
                :placeholder="editing?.hasApiKey ? '留空以保留已加密凭据' : '可选，适用于本地服务'"
              />
              <div
                v-if="editing?.hasApiKey"
                class="flex items-center justify-between gap-3 text-xs text-muted-foreground"
              >
                <span>已在本机安全存储中保存凭据</span>
                <label class="flex items-center gap-2">
                  <input v-model="form.clearApiKey" type="checkbox">清除凭据
                </label>
              </div>
            </div>
            <div class="space-y-1.5">
              <div class="flex items-center justify-between gap-3">
                <label for="pf-model" class="text-sm font-medium">默认模型</label>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  :disabled="loadingModels"
                  @click="loadModels"
                >
                  <Loader2 v-if="loadingModels" class="animate-spin" :size="14" />
                  <RefreshCw v-else :size="14" />加载模型
                </Button>
              </div>
              <Input
                id="pf-model"
                v-model="form.defaultModel"
                list="provider-models"
                placeholder="选择或手动输入模型 ID"
              />
              <datalist id="provider-models">
                <option v-for="model in remoteModels" :key="model.id" :value="model.id" />
              </datalist>
            </div>
            <div class="grid grid-cols-2 gap-3">
              <div class="space-y-1.5">
                <label for="pf-temp" class="text-sm font-medium">Temperature</label>
                <Input
                  id="pf-temp"
                  v-model="form.temperature"
                  type="number"
                  min="0"
                  max="2"
                  step="0.1"
                />
              </div>
              <div class="space-y-1.5">
                <label for="pf-topp" class="text-sm font-medium">Top P</label>
                <Input id="pf-topp" v-model="form.topP" type="number" min="0" max="1" step="0.05" />
              </div>
              <div class="space-y-1.5">
                <label for="pf-max" class="text-sm font-medium">Max Tokens</label>
                <Input id="pf-max" v-model="form.maxOutputTokens" type="number" min="1" step="1" />
              </div>
              <div class="space-y-1.5">
                <label for="pf-seed" class="text-sm font-medium">Seed</label>
                <Input id="pf-seed" v-model="form.seed" type="number" step="1" placeholder="可选" />
              </div>
            </div>
            <div class="flex items-center justify-between rounded-xl border border-border p-3">
              <div>
                <p class="text-sm font-medium">启用 Provider</p>
                <p class="text-xs text-muted-foreground">启用后可在生成和功能测试中选择。</p>
              </div>
              <Switch v-model="form.enabled" aria-label="启用 Provider" />
            </div>
            <p
              v-if="formError"
              class="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive"
            >
              {{ formError }}
            </p>
            <p
              v-if="connectionMessage"
              class="flex items-center gap-2 rounded-lg bg-success/10 px-3 py-2 text-sm text-success"
            >
              <CheckCircle2 :size="15" />{{ connectionMessage }}
            </p>
          </div>
        </form>
        <SheetFooter class="border-t">
          <Button
            type="button"
            variant="outline"
            :disabled="probing || saving"
            @click="testConnection"
          >
            <Loader2 v-if="probing" class="animate-spin" :size="15" />
            <Zap v-else :size="15" />测试连接
          </Button>
          <Button variant="ghost" :disabled="saving" @click="sheetOpen = false">
            <X :size="15" />取消
          </Button>
          <Button type="submit" form="provider-form" :disabled="saving">
            <Loader2 v-if="saving" class="animate-spin" :size="15" />
            <Save v-else :size="15" />{{ saving ? '保存中…' : '保存' }}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  </div>
</template>
