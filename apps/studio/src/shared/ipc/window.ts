export const windowChannels = {
  openSettings: 'studio:window:open-settings',
  openAbout: 'studio:window:open-about',
} as const

export interface WindowApi {
  openSettingsWindow(): Promise<void>
  openAboutWindow(): Promise<void>
}
