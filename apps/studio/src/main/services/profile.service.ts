import { randomUUID } from 'node:crypto'
import { readFile, stat } from 'node:fs/promises'
import { extname, join } from 'node:path'
import { FilesystemObjectStorage } from '@kirika-js/adapter-storage-filesystem'
import type { ObjectStoragePort } from '@kirika-js/core/storage'
import {
  app,
  BrowserWindow,
  dialog,
  type OpenDialogOptions,
  protocol,
} from 'electron'
import type { ProfileApi } from '~/shared/ipc'

const PROFILE_SCHEME = 'kirika-profile'
const PROFILE_AVATAR_PREFIX = 'profile/avatars/'
const MAX_SOURCE_BYTES = 10 * 1024 * 1024
const allowedExtensions = new Set(['.png', '.jpg', '.jpeg', '.webp', '.gif'])
const contentTypes: Readonly<Record<string, string>> = {
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
}

let globalObjectStorage: ObjectStoragePort | null = null

protocol.registerSchemesAsPrivileged([
  {
    scheme: PROFILE_SCHEME,
    privileges: {
      standard: true,
      secure: true,
      supportFetchAPI: true,
      corsEnabled: true,
    },
  },
])

function requireGlobalObjectStorage(): ObjectStoragePort {
  globalObjectStorage ??= new FilesystemObjectStorage({
    rootDir: join(app.getPath('userData'), 'objects'),
  })
  return globalObjectStorage
}

function avatarUrl(key: string) {
  return `${PROFILE_SCHEME}://object/${key
    .split('/')
    .map(encodeURIComponent)
    .join('/')}`
}

export function registerProfileProtocol(): void {
  protocol.handle(PROFILE_SCHEME, async (request) => {
    const url = new URL(request.url)
    if (url.hostname !== 'object') {
      return new Response('Not found', { status: 404 })
    }

    const key = url.pathname
      .split('/')
      .map((part) => decodeURIComponent(part))
      .filter(Boolean)
      .join('/')
    if (!key.startsWith(PROFILE_AVATAR_PREFIX)) {
      return new Response('Not found', { status: 404 })
    }

    try {
      const extension = extname(key).toLowerCase()
      const content = await requireGlobalObjectStorage().get(key)
      const body = content.buffer.slice(
        content.byteOffset,
        content.byteOffset + content.byteLength,
      ) as ArrayBuffer
      return new Response(body, {
        headers: {
          'Content-Type': contentTypes[extension] ?? 'application/octet-stream',
          'Cache-Control': 'no-store',
        },
      })
    } catch {
      return new Response('Not found', { status: 404 })
    }
  })
}

export const profileService: ProfileApi = {
  async selectProfileAvatar() {
    const options: OpenDialogOptions = {
      title: '选择头像',
      properties: ['openFile'],
      filters: [
        { name: '图片', extensions: ['png', 'jpg', 'jpeg', 'webp', 'gif'] },
      ],
    }
    const focusedWindow = BrowserWindow.getFocusedWindow()
    const result = focusedWindow
      ? await dialog.showOpenDialog(focusedWindow, options)
      : await dialog.showOpenDialog(options)
    const sourcePath = result.canceled ? null : result.filePaths[0]
    if (!sourcePath) return { dataUrl: null }

    const extension = extname(sourcePath).toLowerCase()
    if (!allowedExtensions.has(extension)) throw new Error('不支持的头像格式')
    const sourceStat = await stat(sourcePath)
    if (sourceStat.size > MAX_SOURCE_BYTES)
      throw new Error('头像文件不能超过 10 MB')

    const content = await readFile(sourcePath)
    return {
      dataUrl: `data:${contentTypes[extension]};base64,${content.toString('base64')}`,
    }
  },

  async saveProfileAvatar(input) {
    const encoded = input.dataUrl.slice('data:image/png;base64,'.length)
    const content = Buffer.from(encoded, 'base64')
    if (!content.length || content.length > MAX_SOURCE_BYTES)
      throw new Error('裁切后的头像数据无效')

    const key = `${PROFILE_AVATAR_PREFIX}${randomUUID()}.png`
    await requireGlobalObjectStorage().put({
      key,
      data: content,
      contentType: 'image/png',
    })
    return { url: avatarUrl(key) }
  },
}
