import { join } from 'node:path'
import { is } from '@electron-toolkit/utils'
import { BrowserWindow } from 'electron'
import icon from '../../../resources/icon.png?asset'

let settingsWindow: BrowserWindow | null = null

export function openSettingsWindow(): BrowserWindow {
  if (settingsWindow && !settingsWindow.isDestroyed()) {
    if (settingsWindow.isMinimized()) settingsWindow.restore()
    settingsWindow.show()
    settingsWindow.focus()
    return settingsWindow
  }

  settingsWindow = new BrowserWindow({
    width: 920,
    height: 760,
    minWidth: 680,
    minHeight: 560,
    show: false,
    autoHideMenuBar: true,
    title: '设置',
    titleBarStyle: 'hidden',
    ...(process.platform !== 'darwin'
      ? {
          titleBarOverlay: {
            color: '#00000000',
            symbolColor: '#d6d8cf',
            height: 44,
          },
        }
      : {}),
    ...(process.platform !== 'darwin' ? { icon } : {}),
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  })

  settingsWindow.once('ready-to-show', () => {
    settingsWindow?.show()
  })
  settingsWindow.on('closed', () => {
    settingsWindow = null
  })

  if (is.dev && process.env.ELECTRON_RENDERER_URL) {
    const settingsUrl = new URL(process.env.ELECTRON_RENDERER_URL)
    settingsUrl.searchParams.set('window', 'settings')
    settingsUrl.hash = '/settings'
    void settingsWindow.loadURL(settingsUrl.toString())
  } else {
    void settingsWindow.loadFile(join(__dirname, '../renderer/index.html'), {
      query: { window: 'settings' },
      hash: '/settings',
    })
  }

  return settingsWindow
}

export function updateSettingsWindowTitleBarOverlay(color: string, symbolColor: string): void {
  if (process.platform === 'darwin') return
  settingsWindow?.setTitleBarOverlay({ color, symbolColor, height: 44 })
}
