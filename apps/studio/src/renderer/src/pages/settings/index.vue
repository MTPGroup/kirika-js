<script setup lang="ts">
import { Info, ShieldCheck } from '@lucide/vue'
import PageHeader from '@renderer/components/layout/PageHeader.vue'
import { Badge } from '@renderer/components/ui/badge'
</script>

<template>
  <div class="mx-auto flex w-full max-w-3xl flex-col gap-6 px-6 py-7 lg:px-8">
    <PageHeader
      eyebrow="About"
      title="关于 Kirika Studio"
      description="本地优先的角色、世界书与对话创作工具。"
    />

    <section class="flex flex-col gap-5 rounded-2xl border bg-card p-5">
      <div class="flex items-start gap-3">
        <div
          class="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary"
        >
          <Info />
        </div>
        <div class="flex min-w-0 flex-1 flex-col gap-1">
          <h2 class="text-sm font-semibold text-card-foreground">
            Kirika Studio
          </h2>
          <p class="text-xs text-muted-foreground">版本 0.1.0</p>
        </div>
        <Badge variant="outline">本地优先</Badge>
      </div>

      <div class="flex items-start gap-3 rounded-xl bg-muted/40 p-4">
        <ShieldCheck class="shrink-0 text-muted-foreground" />
        <div class="flex flex-col gap-1">
          <p class="text-sm font-medium text-foreground">
            你的数据由工作区管理
          </p>
          <p class="text-xs leading-relaxed text-muted-foreground">
            角色、世界书和会话保存在你选择的本地工作区中。模型配置请前往“模型管理”，个人资料请从侧边栏头像菜单编辑，主题可通过标题栏快速切换。
          </p>
        </div>
      </div>
    </section>
  </div>
</template>
