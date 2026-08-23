<script setup lang="ts">
import SideNav from '@renderer/components/layout/SideNav.vue'
import TitleBar from '@renderer/components/layout/TitleBar.vue'
import { SidebarProvider } from '@renderer/components/ui/sidebar'
</script>

<template>
  <div class="flex h-screen flex-col overflow-hidden bg-background">
    <TitleBar />

    <SidebarProvider
      class="min-h-0 flex-1"
      :default-open="true"
      storage-key="studio-sidebar"
    >
      <SideNav />

      <main class="min-w-0 flex-1 overflow-hidden">
        <RouterView />
      </main>
    </SidebarProvider>
  </div>
</template>
