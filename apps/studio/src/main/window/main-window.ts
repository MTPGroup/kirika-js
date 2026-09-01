import { join } from 'node:path'
import { is } from '@electron-toolkit/utils'
import { BrowserWindow, shell } from 'electron'
import icon from '../../../resources/icon.png?asset'
import { generationService } from '../services/generation.service'

let mainWindow: BrowserWindow | null = null

export function createMainWindow(): void {
  const window = new BrowserWindow({
    width: 1200,
    height: 800,
    minHeight: 900,
    minWidth: 600,

    show: false,
    autoHideMenuBar: true,

    titleBarStyle: 'hidden',

    ...(process.platform === 'darwin'
      ? {
          trafficLightPosition: {
            x: 14,
            y: 15,
          },
        }
      : {
          titleBarOverlay: {
            height: 44,
            color: '#00000000',
          },
        }),

    ...(is.dev && process.platform !== 'darwin' ? { icon } : {}),

    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),

      contextIsolation: true,
      nodeIntegration: false,

      sandbox: true,
    },
  })
  mainWindow = window

  const ownerWebContentsId = window.webContents.id
  window.webContents.once('destroyed', () => {
    void generationService.abortByOwner(ownerWebContentsId).catch((error) => {
      console.error('取消窗口生成任务失败', error)
    })
  })

  window.on('ready-to-show', () => {
    window.show()
  })

  window.webContents.setWindowOpenHandler(({ url }) => {
    const parsed = new URL(url)

    if (parsed.protocol === 'https:' || parsed.protocol === 'http:') {
      void shell.openExternal(url).catch((error) => {
        console.error('打开外部链接失败', error)
      })
    }

    return { action: 'deny' }
  })

  if (is.dev && process.env.ELECTRON_RENDERER_URL) {
    window.loadURL(process.env.ELECTRON_RENDERER_URL)
  } else {
    window.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

export function updateMainWindowTitleBarOverlay(color: string, symbolColor: string): void {
  if (process.platform === 'darwin') return
  mainWindow?.setTitleBarOverlay({ color, symbolColor, height: 44 })
}
