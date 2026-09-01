<script setup lang="ts">
import { ArrowRight, BookOpen, CircleCheck } from '@lucide/vue'
import { Badge } from '@renderer/components/ui/badge'
import { Button } from '@renderer/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@renderer/components/ui/card'
import { Progress } from '@renderer/components/ui/progress'
import { Separator } from '@renderer/components/ui/separator'
import OnboardingStep from '@renderer/components/workspace/OnboardingStep.vue'
import { useStudioStore } from '@renderer/stores/studio'
import { computed } from 'vue'

interface OnboardingStepModel {
  id: 'provider' | 'character' | 'generation'
  title: string
  description: string
  done: boolean
  action: string
  to: string
  disabled?: boolean
  disabledReason?: string
}

const studio = useStudioStore()

const enabledProviders = computed(() => studio.providers.filter((provider) => provider.enabled))
const usableCharacters = computed(() =>
  studio.characters.filter(
    (character) => character.currentRevisionId !== null || character.draftRevisionId !== null,
  ),
)
const hasCompletedGeneration = computed(() =>
  studio.conversations.some((conversation) => conversation.messageCount >= 2),
)
const hasLorebookEntries = computed(() =>
  studio.lorebooks.some((lorebook) => lorebook.entryCount > 0),
)

const providerDescription = computed(() => {
  if (enabledProviders.value.length === 0) {
    return studio.providers.length > 0
      ? '已有模型配置，但当前没有启用的模型'
      : '连接一个 OpenAI 兼容接口'
  }

  const firstProvider = enabledProviders.value[0]
  return enabledProviders.value.length === 1
    ? `已启用 ${firstProvider?.name ?? '1 个模型'}`
    : `已启用 ${enabledProviders.value.length} 个模型`
})

const characterDescription = computed(() => {
  if (usableCharacters.value.length > 0) {
    return `已有 ${usableCharacters.value.length} 个可用角色`
  }

  return studio.characters.length > 0
    ? '已有角色，但还没有可用版本'
    : '创建新角色，或导入已有角色卡'
})

const generationDisabledReason = computed(() => {
  const missing: string[] = []
  if (enabledProviders.value.length === 0) missing.push('启用模型')
  if (usableCharacters.value.length === 0) missing.push('创建可用角色')
  return missing.length > 0 ? `请先${missing.join('并')}` : undefined
})

const requiredSteps = computed<readonly OnboardingStepModel[]>(() => [
  {
    id: 'provider',
    title: '配置模型',
    description: providerDescription.value,
    done: enabledProviders.value.length > 0,
    action: enabledProviders.value.length > 0 ? '查看' : '配置模型',
    to: '/models',
  },
  {
    id: 'character',
    title: '创建或导入角色',
    description: characterDescription.value,
    done: usableCharacters.value.length > 0,
    action: usableCharacters.value.length > 0 ? '查看' : '创建角色',
    to: '/characters',
  },
  {
    id: 'generation',
    title: '运行第一次生成',
    description: hasCompletedGeneration.value ? '已完成第一条角色回复' : '测试角色设定和模型输出',
    done: hasCompletedGeneration.value,
    action: '开始测试',
    to: '/tests',
    disabled: generationDisabledReason.value !== undefined,
    disabledReason: generationDisabledReason.value,
  },
])

const completedRequiredCount = computed(
  () => requiredSteps.value.filter((step) => step.done).length,
)
const requiredProgress = computed(() =>
  Math.round((completedRequiredCount.value / requiredSteps.value.length) * 100),
)
const nextStepId = computed(() => requiredSteps.value.find((step) => !step.done)?.id)
const coreComplete = computed(() => completedRequiredCount.value === requiredSteps.value.length)
</script>

<template>
  <Card class="gap-0 py-0 shadow-none">
    <template v-if="!coreComplete">
      <CardHeader class="gap-4 px-5 pt-5 pb-4">
        <div class="flex items-start justify-between gap-4">
          <div class="flex min-w-0 flex-col gap-1">
            <CardTitle class="text-sm">快速开始</CardTitle>
            <CardDescription class="text-xs leading-relaxed">
              完成基础设置，然后运行第一次角色生成。
            </CardDescription>
          </div>
          <Badge variant="secondary" class="shrink-0">
            {{ completedRequiredCount }}/{{ requiredSteps.length }}
            已完成
          </Badge>
        </div>
        <div class="flex items-center gap-3">
          <Progress :model-value="requiredProgress" aria-label="基础设置进度" />
          <span class="w-8 text-right text-xs tabular-nums text-muted-foreground">
            {{ requiredProgress }}%
          </span>
        </div>
      </CardHeader>

      <CardContent class="flex flex-col gap-1 px-2 pb-3">
        <OnboardingStep
          v-for="step in requiredSteps"
          :key="step.id"
          :title="step.title"
          :description="step.description"
          :done="step.done"
          :action="step.action"
          :to="step.to"
          :current="step.id === nextStepId"
          :disabled="step.disabled"
          :disabled-reason="step.disabledReason"
        />
      </CardContent>
    </template>

    <template v-else>
      <CardHeader class="px-5 pt-5 pb-4">
        <div class="flex items-start gap-3">
          <div
            class="flex size-9 shrink-0 items-center justify-center rounded-full bg-success/15 text-success"
          >
            <CircleCheck aria-hidden="true" />
          </div>
          <div class="flex min-w-0 flex-col gap-1">
            <CardTitle class="text-sm">准备工作已完成</CardTitle>
            <CardDescription class="text-xs leading-relaxed">
              你已经可以开始测试角色，或继续完善世界书设定。
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent class="flex flex-wrap gap-2 px-5 pb-5">
        <Button as-child size="sm">
          <RouterLink to="/tests">
            开始测试
            <ArrowRight data-icon="inline-end" />
          </RouterLink>
        </Button>
        <Button as-child size="sm" variant="outline">
          <RouterLink to="/lorebooks">
            完善世界书
            <BookOpen data-icon="inline-end" />
          </RouterLink>
        </Button>
      </CardContent>
    </template>

    <Separator />

    <CardFooter class="block px-2 py-3">
      <OnboardingStep
        title="添加世界书设定"
        :description="
          hasLorebookEntries
            ? '已有包含设定条目的世界书'
            : '为角色补充背景、知识和行为规则'
        "
        :done="hasLorebookEntries"
        :action="hasLorebookEntries ? '查看' : '添加设定'"
        to="/lorebooks"
        optional
      />
    </CardFooter>
  </Card>
</template>
