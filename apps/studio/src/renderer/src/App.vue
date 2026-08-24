<script setup lang="ts">
import SideNav from '@renderer/components/layout/SideNav.vue'
import TitleBar from '@renderer/components/layout/TitleBar.vue'
import { SidebarInset, SidebarProvider } from '@renderer/components/ui/sidebar'
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
