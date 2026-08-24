import { randomUUID } from 'node:crypto'
import { mkdir, readFile, stat, writeFile } from 'node:fs/promises'
import { extname, join } from 'node:path'
import {
  app,
  BrowserWindow,
  dialog,
  type OpenDialogOptions,
  protocol,
} from 'electron'
import type { ProfileApi } from '~/shared/ipc'

const PROFILE_SCHEME = 'kirika-profile'
const MAX_SOURCE_BYTES = 10 * 1024 * 1024
const allowedExtensions = new Set(['.png', '.jpg', '.jpeg', '.webp', '.gif'])
const contentTypes: Readonly<Record<string, string>> = {
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
}

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

function profileAssetDir() {
  return join(app.getPath('userData'), 'profile')
}

function avatarUrl(fileName: string) {
  return `${PROFILE_SCHEME}://avatar/${encodeURIComponent(fileName)}`
}

export function registerProfileProtocol(): void {
  protocol.handle(PROFILE_SCHEME, async (request) => {
    const url = new URL(request.url)
    const fileName = decodeURIComponent(url.pathname.replace(/^\//, ''))
    if (!/^[a-f0-9-]+\.(png|jpe?g|webp|gif)$/i.test(fileName)) {
      return new Response('Not found', { status: 404 })
    }
    try {
      const extension = extname(fileName).toLowerCase()
      const content = await readFile(join(profileAssetDir(), fileName))
      return new Response(content, {
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

    const directory = profileAssetDir()
    await mkdir(directory, { recursive: true })
    const fileName = `${randomUUID()}.png`
    await writeFile(join(directory, fileName), content)
    return { url: avatarUrl(fileName) }
  },
}
