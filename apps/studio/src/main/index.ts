import { electronApp, optimizer } from '@electron-toolkit/utils'
import { app, BrowserWindow } from 'electron'
import icon from '../../resources/kirika.png?asset'
import { registerStudioIpc } from './ipc'
import { registerProfileProtocol } from './services/profile.service'
import { studioRuntime } from './studio-runtime'
import { createMainWindow } from './window'

app.whenReady().then(() => {
  electronApp.setAppUserModelId('cn.kirika.studio')
  app.setName('Kirika Studio')
  if (process.platform === 'darwin') app.dock?.setIcon(icon)
  registerProfileProtocol()
  registerStudioIpc()

  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  createMainWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createMainWindow()
  })
})

app.on('before-quit', () => {
  void studioRuntime.close()
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})
