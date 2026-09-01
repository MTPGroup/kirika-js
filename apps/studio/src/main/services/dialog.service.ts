import { join } from 'node:path'
import { BrowserWindow, dialog, type OpenDialogOptions, type SaveDialogOptions } from 'electron'
import type { DialogApi, FileFilterDto } from '~/shared/ipc'

function filters(values?: readonly FileFilterDto[]) {
  return values?.map((item) => ({
    name: item.name,
    extensions: [...item.extensions],
  }))
}
export function showOpenDialog(options: OpenDialogOptions) {
  const window = BrowserWindow.getFocusedWindow()
  return window ? dialog.showOpenDialog(window, options) : dialog.showOpenDialog(options)
}
export function showSaveDialog(options: SaveDialogOptions) {
  const window = BrowserWindow.getFocusedWindow()
  return window ? dialog.showSaveDialog(window, options) : dialog.showSaveDialog(options)
}

export const dialogService: DialogApi = {
  async selectDirectory(input = {}) {
    const result = await showOpenDialog({
      title: input.title,
      defaultPath: input.defaultPath,
      properties: ['openDirectory', 'createDirectory'],
    })
    return { path: result.canceled ? null : (result.filePaths[0] ?? null) }
  },
  async selectFile(input = {}) {
    const result = await showOpenDialog({
      title: input.title,
      defaultPath: input.defaultPath,
      filters: filters(input.filters),
      properties: ['openFile'],
    })
    return { path: result.canceled ? null : (result.filePaths[0] ?? null) }
  },
  async saveFile(input = {}) {
    const defaultPath = input.defaultName
      ? input.defaultPath
        ? join(input.defaultPath, input.defaultName)
        : input.defaultName
      : input.defaultPath
    const result = await showSaveDialog({
      title: input.title,
      defaultPath,
      filters: filters(input.filters),
    })
    return { path: result.canceled ? null : (result.filePath ?? null) }
  },
}
