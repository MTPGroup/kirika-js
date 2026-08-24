export interface FileFilterDto {
  readonly name: string
  readonly extensions: readonly string[]
}

export interface SelectDirectoryInput {
  readonly title?: string
  readonly defaultPath?: string
}
export interface SelectFileInput extends SelectDirectoryInput {
  readonly filters?: readonly FileFilterDto[]
}
export interface SaveFileInput extends SelectFileInput {
  readonly defaultName?: string
}
export interface SelectedPathResult {
  readonly path: string | null
}

export const dialogChannels = {
  selectDirectory: 'studio:dialog:select-directory',
  selectFile: 'studio:dialog:select-file',
  saveFile: 'studio:dialog:save-file',
} as const

export interface DialogApi {
  selectDirectory(input?: SelectDirectoryInput): Promise<SelectedPathResult>
  selectFile(input?: SelectFileInput): Promise<SelectedPathResult>
  saveFile(input?: SaveFileInput): Promise<SelectedPathResult>
}
