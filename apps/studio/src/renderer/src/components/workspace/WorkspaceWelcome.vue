<script setup lang="ts">
import { Clock, Database, FolderOpen, Plus } from '@lucide/vue'
import { Button } from '@renderer/components/ui/button'
import { Input } from '@renderer/components/ui/input'
import { api } from '@renderer/services/api'
import { useStudioStore } from '@renderer/stores/studio'
import { ref } from 'vue'

const studio = useStudioStore()
const creating = ref(false)
const name = ref('')
const selectedDirectory = ref<string | null>(null)

async function openWorkspace() {
  const selected = await studio.execute(() =>
    api.selectDirectory({ title: '打开 Workspace' }),
  )
  if (selected?.path) await studio.openWorkspace(selected.path)
}

async function selectCreateDirectory() {
  const selected = await studio.execute(() =>
    api.selectDirectory({ title: '选择 Workspace 目录' }),
  )
  if (selected?.path) selectedDirectory.value = selected.path
}

async function createWorkspace() {
  if (!selectedDirectory.value) return
  await studio.openWorkspace(
    selectedDirectory.value,
    true,
    name.value.trim() || undefined,
  )
}
async function openRecent(path: string) {
  await studio.openWorkspace(path)
}
</script>

<template>
  <main
    class="flex min-h-0 flex-1 items-center justify-center overflow-y-auto bg-background px-6 py-10"
  >
    <div class="w-full max-w-2xl">
      <div
        class="mx-auto flex size-14 items-center justify-center rounded-2xl bg-primary/10 text-primary"
      >
        <Database :size="26" />
      </div>
      <h1 class="mt-5 text-center text-3xl font-semibold tracking-tight">
        Kirika Studio
      </h1>
      <p
        class="mx-auto mt-2 max-w-md text-center text-sm text-muted-foreground"
      >
        打开本地 Workspace，角色、世界书和会话都将保存在你选择的目录中。
      </p>
      <div
        v-if="studio.error"
        class="mt-5 rounded-xl border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive"
      >
        {{ studio.error.message }}
      </div>
      <div class="mt-7 grid gap-3 sm:grid-cols-2">
        <Button type="button" size="lg" class="h-14" @click="openWorkspace"
          ><FolderOpen :size="18" />打开 Workspace</Button
        >
        <Button
          type="button"
          size="lg"
          variant="outline"
          class="h-14"
          @click="creating = !creating"
          ><Plus :size="18" />创建 Workspace</Button
        >
      </div>
      <div
        v-if="creating"
        class="mt-3 flex gap-2 rounded-xl border bg-card p-3"
      >
        <Input
          v-model="name"
          placeholder="Workspace 名称（可选）"
          @keyup.enter="createWorkspace"
        />
        <Button
          type="button"
          variant="outline"
          :disabled="studio.loading"
          @click="selectCreateDirectory"
          >选择目录</Button
        >
        <Button
          type="button"
          :disabled="studio.loading || !selectedDirectory"
          @click="createWorkspace"
          >创建并打开</Button
        >
      </div>
      <p
        v-if="creating && selectedDirectory"
        class="mt-2 truncate rounded-lg bg-muted px-3 py-2 font-mono text-xs text-muted-foreground"
      >
        {{ selectedDirectory }}
      </p>
      <section v-if="studio.recentWorkspaces.length" class="mt-8">
        <div class="mb-3 flex items-center gap-2 text-sm font-medium">
          <Clock :size="15" />最近使用
        </div>
        <div class="space-y-2">
          <button
            v-for="path in studio.recentWorkspaces"
            :key="path"
            type="button"
            class="flex w-full items-center gap-3 rounded-xl border bg-card p-3 text-left transition-colors hover:bg-muted/50"
            @click="openRecent(path)"
          >
            <FolderOpen :size="16" class="shrink-0 text-muted-foreground" />
            <span class="min-w-0 flex-1 truncate font-mono text-xs"
              >{{ path }}</span
            >
          </button>
        </div>
      </section>
    </div>
  </main>
</template>
