<script setup lang="ts">
import { BookOpen, Box, FlaskConical, LayoutGrid, User } from '@lucide/vue'
import ProfileMenu from '@renderer/components/shared/ProfileMenu.vue'
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from '@renderer/components/ui/sidebar'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@renderer/components/ui/tooltip'
import type { Component } from 'vue'
import { useRoute } from 'vue-router'

interface NavItem {
  label: string
  icon: Component
  to: string
}

const route = useRoute()

const items: NavItem[] = [
  {
    label: '工作区',
    icon: LayoutGrid,
    to: '/',
  },
  {
    label: '角色',
    icon: User,
    to: '/characters',
  },
  {
    label: '世界书',
    icon: BookOpen,
    to: '/lorebooks',
  },
  {
    label: '模型管理',
    icon: Box,
    to: '/models',
  },
  {
    label: '功能测试',
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
  <Sidebar collapsible="none" class="[--sidebar-width:3rem]">
    <SidebarHeader class="items-center">
      <ProfileMenu />
    </SidebarHeader>
    <SidebarContent class="overflow-hidden py-3">
      <SidebarGroup class="p-0">
        <SidebarGroupContent>
          <SidebarMenu class="items-center gap-1 px-1">
            <SidebarMenuItem
              v-for="item in items"
              :key="item.to"
              class="flex w-full justify-center"
            >
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger as-child>
                    <SidebarMenuButton
                      as-child
                      :is-active="isActive(item.to)"
                      class="size-8! justify-center rounded-md p-0!"
                    >
                      <RouterLink
                        :to="item.to"
                        :aria-label="item.label"
                        class="flex size-full items-center justify-center"
                      >
                        <component
                          :is="item.icon"
                          :size="18"
                          :stroke-width="isActive(item.to) ? 1.5 : 1.75"
                        />
                      </RouterLink>
                    </SidebarMenuButton>
                  </TooltipTrigger>

                  <TooltipContent side="right">
                    {{ item.label }}
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarGroupContent>
      </SidebarGroup>
    </SidebarContent>
  </Sidebar>
</template>
