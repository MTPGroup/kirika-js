import { join } from 'node:path'
import { is } from '@electron-toolkit/utils'
import { BrowserWindow, shell } from 'electron'
import icon from '../../../resources/icon.png?asset'

let aboutWindow: BrowserWindow | null = null

export function openAboutWindow(): BrowserWindow {
  if (aboutWindow && !aboutWindow.isDestroyed()) {
    aboutWindow.show()
    aboutWindow.focus()
    return aboutWindow
  }

  aboutWindow = new BrowserWindow({
    width: 520,
    height: 620,
    minWidth: 440,
    minHeight: 520,
    show: false,
    resizable: true,
    maximizable: false,
    autoHideMenuBar: true,
    title: '关于 Kirika Studio',
    ...(process.platform !== 'darwin' ? { icon } : {}),
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  })

  aboutWindow.once('ready-to-show', () => aboutWindow?.show())
  aboutWindow.on('closed', () => {
    aboutWindow = null
  })
  aboutWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('https://') || url.startsWith('http://'))
      void shell.openExternal(url)
    return { action: 'deny' }
  })

  if (is.dev && process.env.ELECTRON_RENDERER_URL) {
    const url = new URL(process.env.ELECTRON_RENDERER_URL)
    url.searchParams.set('window', 'about')
    url.hash = '/about'
    void aboutWindow.loadURL(url.toString())
  } else {
    void aboutWindow.loadFile(join(__dirname, '../renderer/index.html'), {
      query: { window: 'about' },
      hash: '/about',
    })
  }

  return aboutWindow
}
