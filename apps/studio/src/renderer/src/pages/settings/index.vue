<script setup lang="ts">
import {
  Check,
  Database,
  FolderOpen,
  HardDrive,
  Info,
  Monitor,
  Moon,
  Server,
  Shield,
  Sun,
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
import { RadioGroup, RadioGroupItem } from '@renderer/components/ui/radio-group'
import { workspaceState } from '@renderer/lib/demo'
import { type Theme, useThemeStore } from '@renderer/stores/theme'
import { computed, ref } from 'vue'

const theme = useThemeStore()
const profileName = ref(localStorage.getItem('kirika-profile-name') || '我')
const profileAvatar = ref(localStorage.getItem('kirika-profile-avatar') || '')
function saveProfile() {
  localStorage.setItem('kirika-profile-name', profileName.value.trim() || '我')
  localStorage.setItem('kirika-profile-avatar', profileAvatar.value.trim())
}
const themePreference = computed({
  get: () => theme.preference,
  set: (value: Theme) => theme.setTheme(value),
})

const themeOptions: { value: Theme; label: string; icon: typeof Sun }[] = [
  { value: 'light', label: '浅色', icon: Sun },
  { value: 'dark', label: '深色', icon: Moon },
  { value: 'system', label: '跟随系统', icon: Monitor },
]

const storageRows = [
  { label: '工作区', value: workspaceState.workspaceDir, icon: FolderOpen },
  { label: '数据库', value: workspaceState.dbPath, icon: Database },
  { label: '资产目录', value: workspaceState.assetsDir, icon: HardDrive },
]
</script>

<template>
  <div class="mx-auto w-full max-w-215 px-6 py-7 lg:px-8">
    <PageHeader
      eyebrow="Settings"
      title="设置"
      description="调整外观、模型与本地数据偏好。"
    />

    <div class="mt-6 space-y-5">
      <!-- Profile -->
      <section class="rounded-2xl border border-border bg-card p-5">
        <div class="flex items-center gap-3">
          <Avatar class="size-12"
            ><AvatarImage
              v-if="profileAvatar"
              :src="profileAvatar"
              :alt="profileName"
            /><AvatarFallback
              >{{ profileName.slice(0, 1) }}</AvatarFallback
            ></Avatar
          >
          <div>
            <h2 class="text-sm font-semibold">本地用户资料</h2>
            <p class="text-muted-foreground text-xs">
              用于连续对话中的用户头像和名称。
            </p>
          </div>
        </div>
        <div class="mt-4 grid gap-3 sm:grid-cols-2">
          <div class="space-y-1.5">
            <label for="profile-name" class="text-sm font-medium">名称</label>
            <Input
              id="profile-name"
              v-model="profileName"
              placeholder="你的名称"
            />
          </div>
          <div class="space-y-1.5">
            <label for="profile-avatar" class="text-sm font-medium"
              >头像地址</label
            ><Input
              id="profile-avatar"
              v-model="profileAvatar"
              placeholder="本地或网络图片地址"
            />
          </div>
        </div>
        <Button class="mt-4" size="sm" @click="saveProfile"
          >保存用户资料</Button
        >
      </section>

      <!-- Appearance -->
      <section class="rounded-2xl border border-border bg-card p-5">
        <div class="flex items-center gap-2">
          <Sun :size="16" class="text-muted-foreground" />
          <h2 class="text-foreground text-sm font-semibold">外观</h2>
        </div>
        <p class="text-muted-foreground mt-1 text-xs">
          选择界面主题，或跟随系统偏好。
        </p>
        <RadioGroup
          v-model="themePreference"
          class="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3"
        >
          <label
            v-for="opt in themeOptions"
            :key="opt.value"
            :for="`theme-${opt.value}`"
            :class="theme.preference === opt.value ? 'border-primary/50 bg-muted' : 'border-border hover:bg-muted/50'"
            class="flex cursor-pointer items-center gap-3 rounded-xl border p-3 text-left transition-colors"
          >
            <RadioGroupItem
              :id="`theme-${opt.value}`"
              :value="opt.value"
              :aria-label="opt.label"
            />
            <component
              :is="opt.icon"
              :size="18"
              class="text-muted-foreground"
            />
            <span class="text-foreground flex-1 text-sm font-medium"
              >{{ opt.label }}</span
            >
            <Check
              v-if="theme.preference === opt.value"
              :size="16"
              class="text-primary"
            />
          </label>
        </RadioGroup>
      </section>

      <!-- Models summary -->
      <section class="rounded-2xl border border-border bg-card p-5">
        <div class="flex items-center gap-2">
          <Server :size="16" class="text-muted-foreground" />
          <h2 class="text-foreground text-sm font-semibold">模型</h2>
        </div>
        <div class="mt-4 space-y-2">
          <div
            class="flex items-center justify-between rounded-xl bg-muted/40 p-3"
          >
            <div>
              <p class="text-foreground text-sm font-medium">OpenAI 兼容接口</p>
              <p class="text-muted-foreground text-xs">
                DeepSeek · deepseek-chat
              </p>
            </div>
            <Badge variant="success">已启用</Badge>
          </div>
        </div>
        <div class="mt-4">
          <Button as-child variant="outline" size="sm" class="gap-1.5">
            <RouterLink to="/models">管理模型</RouterLink>
          </Button>
        </div>
      </section>

      <!-- Data -->
      <section class="rounded-2xl border border-border bg-card p-5">
        <div class="flex items-center gap-2">
          <Shield :size="16" class="text-muted-foreground" />
          <h2 class="text-foreground text-sm font-semibold">数据与存储</h2>
        </div>
        <p class="text-muted-foreground mt-1 text-xs">
          数据默认仅保存在本地，不会上传。
        </p>
        <div class="mt-4 space-y-2">
          <div
            v-for="row in storageRows"
            :key="row.label"
            class="flex items-center gap-3 rounded-xl bg-muted/40 p-3"
          >
            <component
              :is="row.icon"
              :size="16"
              class="text-muted-foreground shrink-0"
            />
            <div class="min-w-0">
              <p class="text-foreground text-sm font-medium">{{ row.label }}</p>
              <p class="text-muted-foreground truncate font-mono text-xs">
                {{ row.value }}
              </p>
            </div>
          </div>
        </div>
      </section>

      <!-- About -->
      <section class="rounded-2xl border border-border bg-card p-5">
        <div class="flex items-center gap-2">
          <Info :size="16" class="text-muted-foreground" />
          <h2 class="text-foreground text-sm font-semibold">关于</h2>
        </div>
        <div class="mt-4 flex items-center justify-between">
          <div>
            <p class="text-foreground text-sm font-medium">Kirika Studio</p>
            <p class="text-muted-foreground text-xs">
              版本 0.1.0 · schema v{{ workspaceState.schemaVersion }}
            </p>
          </div>
          <Badge variant="outline">本地优先</Badge>
        </div>
      </section>
    </div>
  </div>
</template>
