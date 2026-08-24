import { join } from 'node:path'
import { is } from '@electron-toolkit/utils'
import { BrowserWindow, shell } from 'electron'
import icon from '../../resources/kirika.png?asset'
import { generationService } from './services/generation.service'

export function createMainWindow(): void {
  const mainWindow = new BrowserWindow({
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
            color: '#0f1016',
            symbolColor: '#a1a1aa',
          },
        }),

    ...(process.platform !== 'darwin' ? { icon } : {}),

    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),

      contextIsolation: true,
      nodeIntegration: false,

      sandbox: false,
    },
  })

  const ownerWebContentsId = mainWindow.webContents.id
  mainWindow.webContents.once('destroyed', () => {
    void generationService.abortByOwner(ownerWebContentsId).catch((error) => {
      console.error('取消窗口生成任务失败', error)
    })
  })

  mainWindow.on('ready-to-show', () => {
    mainWindow.show()
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  if (is.dev && process.env.ELECTRON_RENDERER_URL) {
    mainWindow.loadURL(process.env.ELECTRON_RENDERER_URL)
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}
