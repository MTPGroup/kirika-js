export const windowChannels = {
  openSettings: 'studio:window:open-settings',
} as const

export interface WindowApi {
  openSettingsWindow(): Promise<void>
}
