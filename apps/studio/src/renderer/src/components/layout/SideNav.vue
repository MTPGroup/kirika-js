<script setup lang="ts">
import {
  BookOpen,
  Box,
  FlaskConical,
  FolderOpen,
  LayoutGrid,
  Settings,
  User,
} from '@lucide/vue'
import { Button } from '@renderer/components/ui/button'
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from '@renderer/components/ui/sidebar'
import { api } from '@renderer/services/api'
import { useStudioStore } from '@renderer/stores/studio'
import type { Component } from 'vue'
import { useRoute } from 'vue-router'

interface NavItem {
  label: string
  icon: Component
  to: string
}

const route = useRoute()
const studio = useStudioStore()
async function switchWorkspace() {
  const selected = await studio.execute(() =>
    api.selectDirectory({ title: '切换 Workspace' }),
  )
  if (selected?.path) await studio.openWorkspace(selected.path)
}

const items: NavItem[] = [
  {
    label: 'Workspace',
    icon: LayoutGrid,
    to: '/',
  },
  {
    label: 'Characters',
    icon: User,
    to: '/characters',
  },
  {
    label: 'Lorebooks',
    icon: BookOpen,
    to: '/lorebooks',
  },
  {
    label: 'Models',
    icon: Box,
    to: '/models',
  },
  {
    label: 'Tests',
    icon: FlaskConical,
    to: '/tests',
  },
]

const isActive = (to: string) => {
  if (to === '/') {
    return route.path === '/'
  }

  return route.path === to || route.path.startsWith(`${to}/`)
}
</script>

<template>
  <Sidebar collapsible="none" class="[--sidebar-width:4.25rem]">
    <SidebarContent class="overflow-hidden py-3">
      <SidebarGroup class="p-0">
        <SidebarGroupContent>
          <SidebarMenu class="items-center gap-1 px-1">
            <SidebarMenuItem
              v-for="item in items"
              :key="item.to"
              class="w-full"
            >
              <SidebarMenuButton
                as-child
                :is-active="isActive(item.to)"
                class="
                  h-auto w-full
                  flex-col gap-1
                  rounded-lg py-2
                  text-[10px] font-normal
                  data-[active=true]:text-sidebar-primary
                "
              >
                <RouterLink :to="item.to">
                  <component :is="item.icon" :size="18" :stroke-width="1.75" />

                  <span>
                    {{ item.label }}
                  </span>
                </RouterLink>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarGroupContent>
      </SidebarGroup>
    </SidebarContent>

    <SidebarFooter class="items-center gap-1 p-2">
      <Button
        variant="ghost"
        size="icon-sm"
        title="切换 Workspace"
        @click="switchWorkspace"
      >
        <FolderOpen :size="17" />
      </Button>
      <SidebarMenu class="w-full">
        <SidebarMenuItem>
          <SidebarMenuButton
            as-child
            :is-active="isActive('/settings')"
            class="
              h-auto w-full
              flex-col gap-1
              rounded-lg py-2
              text-[10px] font-normal
              data-[active=true]:text-sidebar-primary
            "
          >
            <RouterLink to="/settings">
              <Settings :size="18" :stroke-width="1.75" />

              <span>Settings</span>
            </RouterLink>
          </SidebarMenuButton>
        </SidebarMenuItem>
      </SidebarMenu>
    </SidebarFooter>
  </Sidebar>
</template>
