export interface SelectedProfileAvatarResult {
  readonly dataUrl: string | null
}

export interface SaveProfileAvatarInput {
  readonly dataUrl: string
}

export interface SavedProfileAvatarResult {
  readonly url: string
}

export const profileChannels = {
  selectAvatar: 'studio:profile:select-avatar',
  saveAvatar: 'studio:profile:save-avatar',
} as const

export interface ProfileApi {
  selectProfileAvatar(): Promise<SelectedProfileAvatarResult>
  saveProfileAvatar(input: SaveProfileAvatarInput): Promise<SavedProfileAvatarResult>
}
