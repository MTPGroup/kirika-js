import { extname } from 'node:path'
import { protocol } from 'electron'
import { studioRuntime } from '../studio-runtime'

const ASSET_SCHEME = 'kirika-asset'
const contentTypes: Readonly<Record<string, string>> = {
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.mp3': 'audio/mpeg',
  '.wav': 'audio/wav',
  '.ogg': 'audio/ogg',
  '.mp4': 'video/mp4',
  '.webm': 'video/webm',
}

protocol.registerSchemesAsPrivileged([
  {
    scheme: ASSET_SCHEME,
    privileges: {
      standard: true,
      secure: true,
      supportFetchAPI: true,
      corsEnabled: true,
    },
  },
])

export function registerAssetProtocol(): void {
  protocol.handle(ASSET_SCHEME, async (request) => {
    try {
      const url = new URL(request.url)
      const storageKey = [url.hostname, url.pathname]
        .join('')
        .split('/')
        .map((part) => decodeURIComponent(part))
        .filter(Boolean)
        .join('/')
      if (!storageKey) return new Response('Not found', { status: 404 })
      const content = await studioRuntime
        .requireActive()
        .assetStore.get(storageKey)
      const body = content.buffer.slice(
        content.byteOffset,
        content.byteOffset + content.byteLength,
      ) as ArrayBuffer
      return new Response(body, {
        headers: {
          'Content-Type':
            contentTypes[extname(storageKey).toLowerCase()] ??
            'application/octet-stream',
          'Cache-Control': 'private, max-age=31536000, immutable',
        },
      })
    } catch {
      return new Response('Not found', { status: 404 })
    }
  })
}
