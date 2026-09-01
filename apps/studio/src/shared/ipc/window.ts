export const windowChannels = {
  openSettings: 'studio:window:open-settings',
  openAbout: 'studio:window:open-about',
  updateTitleBarOverlay: 'studio:window:update-title-bar-overlay',
} as const

export interface WindowApi {
  openSettingsWindow(): Promise<void>
  openAboutWindow(): Promise<void>
  updateTitleBarOverlay(input: { color: string; symbolColor: string }): Promise<void>
}
