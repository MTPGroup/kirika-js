<script setup lang="ts">
import { Camera, Pencil, UserRound } from '@lucide/vue'
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from '@renderer/components/ui/avatar'
import { Button } from '@renderer/components/ui/button'
import {
  Dialog,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogScrollContent,
  DialogTitle,
} from '@renderer/components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@renderer/components/ui/dropdown-menu'
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from '@renderer/components/ui/field'
import { Input } from '@renderer/components/ui/input'
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@renderer/components/ui/select'
import { Textarea } from '@renderer/components/ui/textarea'
import { type ProfileDraft, useProfileStore } from '@renderer/stores/profile'
import { Cropper } from 'vue-advanced-cropper'
import 'vue-advanced-cropper/dist/style.css'
import { reactive, ref, useTemplateRef } from 'vue'

const profile = useProfileStore()
const editorOpen = ref(false)
const cropperOpen = ref(false)
const selectingAvatar = ref(false)
const savingCrop = ref(false)
const cropSource = ref('')
const cropper = useTemplateRef<InstanceType<typeof Cropper>>('cropper')
const draft = reactive<ProfileDraft>(profile.snapshot())

const genderOptions = [
  { value: 'female', label: '女' },
  { value: 'male', label: '男' },
  { value: 'other', label: '其他' },
  { value: 'private', label: '不公开' },
]
const countryOptions = [
  { value: 'CN', label: '中国' },
  { value: 'JP', label: '日本' },
  { value: 'US', label: '美国' },
  { value: 'other', label: '其他' },
]

function openEditor() {
  Object.assign(draft, profile.snapshot())
  editorOpen.value = true
}

async function selectAvatar() {
  selectingAvatar.value = true
  try {
    const selected = await window.api.selectProfileAvatar()
    if (selected.dataUrl) {
      cropSource.value = selected.dataUrl
      cropperOpen.value = true
    }
  } finally {
    selectingAvatar.value = false
  }
}

async function applyCrop() {
  const result = cropper.value?.getResult()
  const canvas = result?.canvas
  if (!canvas) return

  savingCrop.value = true
  try {
    const saved = await window.api.saveProfileAvatar({
      dataUrl: canvas.toDataURL('image/png'),
    })
    draft.avatar = saved.url
    cropperOpen.value = false
    cropSource.value = ''
  } finally {
    savingCrop.value = false
  }
}

function saveProfile() {
  profile.save(draft)
  editorOpen.value = false
}
</script>

<template>
  <Dialog v-model:open="editorOpen">
    <DropdownMenu>
      <DropdownMenuTrigger as-child>
        <button
          type="button"
          class="rounded-full outline-none ring-offset-background focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          aria-label="打开个人资料菜单"
        >
          <Avatar class="size-9 border border-sidebar-border">
            <AvatarImage
              v-if="profile.avatar"
              :src="profile.avatar"
              :alt="profile.name"
            />
            <AvatarFallback>{{ profile.initials }}</AvatarFallback>
          </Avatar>
        </button>
      </DropdownMenuTrigger>

      <DropdownMenuContent
        side="right"
        align="start"
        :side-offset="10"
        class="w-64"
      >
        <DropdownMenuLabel class="flex items-center gap-3 p-3 font-normal">
          <Avatar class="size-12 border">
            <AvatarImage
              v-if="profile.avatar"
              :src="profile.avatar"
              :alt="profile.name"
            />
            <AvatarFallback>{{ profile.initials }}</AvatarFallback>
          </Avatar>
          <span class="flex min-w-0 flex-1 flex-col gap-0.5">
            <span class="truncate text-sm font-semibold text-foreground">
              {{ profile.name }}
            </span>
            <span class="truncate text-xs text-muted-foreground">
              {{ profile.bio || '本地用户' }}
            </span>
          </span>
        </DropdownMenuLabel>

        <DropdownMenuSeparator />

        <DropdownMenuGroup>
          <DropdownMenuItem @select="openEditor">
            <Pencil />
            编辑资料
          </DropdownMenuItem>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>

    <DialogScrollContent class="max-w-2xl gap-0 overflow-hidden p-0">
      <DialogHeader class="border-b px-6 py-4 text-left">
        <DialogTitle>编辑资料</DialogTitle>
        <DialogDescription>
          此资料仅保存在本机，并用于对话中的用户身份。
        </DialogDescription>
      </DialogHeader>

      <form @submit.prevent="saveProfile">
        <div class="page-scroll max-h-[70vh] overflow-y-auto px-6 py-6">
          <div class="flex flex-col items-center gap-3 pb-6">
            <button
              type="button"
              class="group relative rounded-full outline-none ring-offset-background focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-60"
              :disabled="selectingAvatar"
              aria-label="选择头像图片"
              @click="selectAvatar"
            >
              <Avatar
                class="size-24 border-2 border-background shadow-md ring-1 ring-border"
              >
                <AvatarImage
                  v-if="draft.avatar"
                  :key="draft.avatar"
                  :src="draft.avatar"
                  :alt="draft.name || '头像预览'"
                />
                <AvatarFallback>
                  <UserRound class="size-8" />
                </AvatarFallback>
              </Avatar>
              <span
                class="absolute inset-0 flex items-center justify-center rounded-full bg-foreground/45 text-background opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100"
              >
                <Camera />
              </span>
            </button>
            <p class="text-xs text-muted-foreground">
              {{ selectingAvatar ? '正在选择头像…' : '点击头像从本机选择图片' }}
            </p>
          </div>

          <FieldGroup>
            <Field>
              <FieldLabel for="profile-name">昵称</FieldLabel>
              <Input
                id="profile-name"
                v-model="draft.name"
                maxlength="36"
                placeholder="你的名称"
              />
              <FieldDescription class="text-right">
                {{ draft.name.length }}/36
              </FieldDescription>
            </Field>

            <Field>
              <FieldLabel for="profile-bio">个性签名</FieldLabel>
              <Textarea
                id="profile-bio"
                v-model="draft.bio"
                maxlength="80"
                placeholder="介绍一下自己"
                class="min-h-20 resize-none"
              />
              <FieldDescription class="text-right">
                {{ draft.bio.length }}/80
              </FieldDescription>
            </Field>

            <div class="grid gap-4 sm:grid-cols-2">
              <Field>
                <FieldLabel for="profile-gender">性别</FieldLabel>
                <Select v-model="draft.gender">
                  <SelectTrigger id="profile-gender" class="w-full">
                    <SelectValue placeholder="请选择" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      <SelectItem
                        v-for="option in genderOptions"
                        :key="option.value"
                        :value="option.value"
                      >
                        {{ option.label }}
                      </SelectItem>
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </Field>

              <Field>
                <FieldLabel for="profile-birthday">生日</FieldLabel>
                <Input
                  id="profile-birthday"
                  v-model="draft.birthday"
                  type="date"
                />
              </Field>
            </div>

            <div class="grid gap-4 sm:grid-cols-2">
              <Field>
                <FieldLabel for="profile-country">国家或地区</FieldLabel>
                <Select v-model="draft.country">
                  <SelectTrigger id="profile-country" class="w-full">
                    <SelectValue placeholder="请选择" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      <SelectItem
                        v-for="option in countryOptions"
                        :key="option.value"
                        :value="option.value"
                      >
                        {{ option.label }}
                      </SelectItem>
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </Field>

              <Field>
                <FieldLabel for="profile-region">所在地区</FieldLabel>
                <Input
                  id="profile-region"
                  v-model="draft.region"
                  placeholder="城市或地区"
                />
              </Field>
            </div>
          </FieldGroup>
        </div>

        <DialogFooter class="border-t bg-muted/30 px-6 py-4">
          <Button type="button" variant="outline" @click="editorOpen = false">
            取消
          </Button>
          <Button type="submit">保存</Button>
        </DialogFooter>
      </form>
    </DialogScrollContent>
  </Dialog>

  <Dialog v-model:open="cropperOpen">
    <DialogScrollContent class="max-w-xl gap-0 overflow-hidden p-0">
      <DialogHeader class="border-b px-6 py-4 text-left">
        <DialogTitle>裁切头像</DialogTitle>
        <DialogDescription>
          拖动图片调整位置，滚轮或触控手势可缩放，头像将保存为正方形。
        </DialogDescription>
      </DialogHeader>

      <div class="min-w-0 bg-muted p-6">
        <div
          class="mx-auto h-[min(24rem,60vh)] w-full max-w-md min-w-0 overflow-hidden rounded-xl bg-black"
        >
          <Cropper
            v-if="cropSource"
            ref="cropper"
            class="size-full min-w-0 overflow-hidden"
            :src="cropSource"
            :stencil-props="{ aspectRatio: 1 }"
            :canvas="{ width: 512, height: 512, maxArea: 1048576 }"
            image-restriction="stencil"
          />
        </div>
      </div>

      <DialogFooter class="border-t bg-background px-6 py-4">
        <Button
          type="button"
          variant="outline"
          :disabled="savingCrop"
          @click="cropperOpen = false"
        >
          取消
        </Button>
        <Button type="button" :disabled="savingCrop" @click="applyCrop">
          {{ savingCrop ? '正在保存…' : '使用此头像' }}
        </Button>
      </DialogFooter>
    </DialogScrollContent>
  </Dialog>
</template>

<style scoped>
:deep(.vue-advanced-cropper),
:deep(.vue-advanced-cropper__cropper-wrapper),
:deep(.vue-advanced-cropper__image-wrapper) {
  max-width: 100%;
  max-height: 100%;
  overflow: hidden;
}
</style>
