import { defineStore } from 'pinia'
import { computed, ref } from 'vue'

export interface ProfileDraft {
  name: string
  avatar: string
  bio: string
  gender: string
  birthday: string
  country: string
  region: string
}

const PROFILE_STORAGE_KEY = 'kirika-profile'
const LEGACY_NAME_STORAGE_KEY = 'kirika-profile-name'
const LEGACY_AVATAR_STORAGE_KEY = 'kirika-profile-avatar'

const defaultProfile: ProfileDraft = {
  name: '我',
  avatar: '',
  bio: '',
  gender: '',
  birthday: '',
  country: '',
  region: '',
}

function parseProfile(value: string | null): ProfileDraft | null {
  if (!value) return null

  try {
    const parsed = JSON.parse(value) as Partial<ProfileDraft>
    return {
      name: parsed.name?.trim() || defaultProfile.name,
      avatar: parsed.avatar?.trim() || '',
      bio: parsed.bio?.trim() || '',
      gender: parsed.gender || '',
      birthday: parsed.birthday || '',
      country: parsed.country || '',
      region: parsed.region || '',
    }
  } catch {
    return null
  }
}

export const useProfileStore = defineStore('profile', () => {
  const name = ref(defaultProfile.name)
  const avatar = ref(defaultProfile.avatar)
  const bio = ref(defaultProfile.bio)
  const gender = ref(defaultProfile.gender)
  const birthday = ref(defaultProfile.birthday)
  const country = ref(defaultProfile.country)
  const region = ref(defaultProfile.region)

  const initials = computed(() => name.value.trim().slice(0, 2) || '我')

  function apply(profile: ProfileDraft) {
    name.value = profile.name
    avatar.value = profile.avatar
    bio.value = profile.bio
    gender.value = profile.gender
    birthday.value = profile.birthday
    country.value = profile.country
    region.value = profile.region
  }

  function snapshot(): ProfileDraft {
    return {
      name: name.value,
      avatar: avatar.value,
      bio: bio.value,
      gender: gender.value,
      birthday: birthday.value,
      country: country.value,
      region: region.value,
    }
  }

  function save(draft: ProfileDraft) {
    const normalized: ProfileDraft = {
      name: draft.name.trim() || defaultProfile.name,
      avatar: draft.avatar.trim(),
      bio: draft.bio.trim(),
      gender: draft.gender,
      birthday: draft.birthday,
      country: draft.country,
      region: draft.region,
    }
    apply(normalized)
    localStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(normalized))
  }

  function syncFromStorage(event: StorageEvent) {
    if (event.key !== PROFILE_STORAGE_KEY) return
    const nextProfile = parseProfile(event.newValue)
    if (nextProfile) apply(nextProfile)
  }

  function initialize() {
    const stored = parseProfile(localStorage.getItem(PROFILE_STORAGE_KEY))
    if (stored) {
      apply(stored)
    } else {
      apply({
        ...defaultProfile,
        name: localStorage.getItem(LEGACY_NAME_STORAGE_KEY)?.trim() || defaultProfile.name,
        avatar: localStorage.getItem(LEGACY_AVATAR_STORAGE_KEY)?.trim() || defaultProfile.avatar,
      })
    }
    window.addEventListener('storage', syncFromStorage)
  }

  return {
    name,
    avatar,
    bio,
    gender,
    birthday,
    country,
    region,
    initials,
    snapshot,
    save,
    initialize,
  }
})
