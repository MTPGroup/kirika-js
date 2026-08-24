<script setup lang="ts">
import darkStarterBackground from '@renderer/assets/starter/dark.png'
import lightStarterBackground from '@renderer/assets/starter/light.png'
import SideNav from '@renderer/components/layout/SideNav.vue'
import TitleBar from '@renderer/components/layout/TitleBar.vue'
import { SidebarInset, SidebarProvider } from '@renderer/components/ui/sidebar'
import WorkspaceWelcome from '@renderer/components/workspace/WorkspaceWelcome.vue'
import { useStudioStore } from '@renderer/stores/studio'
import { useThemeStore } from '@renderer/stores/theme'
import { computed } from 'vue'

const studio = useStudioStore()
const theme = useThemeStore()
const isSettingsWindow =
  new URLSearchParams(window.location.search).get('window') === 'settings'
const starterBackground = computed(() =>
  theme.appearance === 'light' ? lightStarterBackground : darkStarterBackground,
)
</script>

<template>
  <div class="flex h-screen flex-col overflow-hidden bg-background">
    <TitleBar v-if="!isSettingsWindow" />

    <div
      v-if="isSettingsWindow"
      class="page-scroll min-h-0 flex-1 overflow-y-auto"
    >
      <RouterView />
    </div>

    <WorkspaceWelcome
      v-else-if="!studio.isOpen"
      class="bg-cover bg-center bg-no-repeat"
      :style="{ backgroundImage: `url(${starterBackground})` }"
    />

    <SidebarProvider
      v-else
      class="min-h-0 flex-1"
      :default-open="true"
      storage-key="studio-sidebar"
    >
      <SideNav />

      <SidebarInset>
        <div class="bg-background relative flex min-h-0 flex-1 flex-col">
          <div class="page-scroll bg-background min-h-0 flex-1 overflow-y-auto">
            <RouterView />
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  </div>
</template>
