import { defineStore } from 'pinia'
import { computed, ref } from 'vue'

export type Appearance = 'light' | 'dark' | 'system'
export type CharacterTheme = 'kirika' | 'shirabe'

const APPEARANCE_STORAGE_KEY = 'studio-appearance'
const CHARACTER_THEME_STORAGE_KEY = 'studio-character-theme'

export const useThemeStore = defineStore('theme', () => {
  const appearance = ref<Appearance>('system')
  const characterTheme = ref<CharacterTheme>('kirika')

  const systemDark = ref(false)

  const resolvedAppearance = computed<'light' | 'dark'>(() => {
    if (appearance.value === 'system') {
      return systemDark.value ? 'dark' : 'light'
    }

    return appearance.value
  })

  const isDark = computed(() => resolvedAppearance.value === 'dark')

  function applyAppearance() {
    const root = document.documentElement

    root.classList.toggle('dark', isDark.value)
    root.style.colorScheme = isDark.value ? 'dark' : 'light'
  }

  function applyCharacterTheme() {
    const root = document.documentElement

    root.classList.remove('theme-kirika', 'theme-shirabe')

    root.classList.add(`theme-${characterTheme.value}`)
  }

  function apply() {
    applyAppearance()
    applyCharacterTheme()
  }

  function setAppearance(value: Appearance) {
    appearance.value = value

    localStorage.setItem(APPEARANCE_STORAGE_KEY, value)

    applyAppearance()
  }

  function setCharacterTheme(value: CharacterTheme) {
    characterTheme.value = value

    localStorage.setItem(CHARACTER_THEME_STORAGE_KEY, value)

    applyCharacterTheme()
  }

  function toggleAppearance() {
    setAppearance(resolvedAppearance.value === 'dark' ? 'light' : 'dark')
  }

  function toggleCharacterTheme() {
    setCharacterTheme(characterTheme.value === 'kirika' ? 'shirabe' : 'kirika')
  }

  function syncFromStorage(event: StorageEvent) {
    if (
      event.key === APPEARANCE_STORAGE_KEY &&
      (event.newValue === 'light' ||
        event.newValue === 'dark' ||
        event.newValue === 'system')
    ) {
      appearance.value = event.newValue
      applyAppearance()
      return
    }

    if (
      event.key === CHARACTER_THEME_STORAGE_KEY &&
      (event.newValue === 'kirika' || event.newValue === 'shirabe')
    ) {
      characterTheme.value = event.newValue
      applyCharacterTheme()
    }
  }

  function initialize() {
    const media = window.matchMedia('(prefers-color-scheme: dark)')

    systemDark.value = media.matches

    const storedAppearance = localStorage.getItem(APPEARANCE_STORAGE_KEY)

    if (
      storedAppearance === 'light' ||
      storedAppearance === 'dark' ||
      storedAppearance === 'system'
    ) {
      appearance.value = storedAppearance
    }

    const storedCharacterTheme = localStorage.getItem(
      CHARACTER_THEME_STORAGE_KEY,
    )

    if (
      storedCharacterTheme === 'kirika' ||
      storedCharacterTheme === 'shirabe'
    ) {
      characterTheme.value = storedCharacterTheme
    }

    apply()

    window.addEventListener('storage', syncFromStorage)
    media.addEventListener('change', (event) => {
      systemDark.value = event.matches

      if (appearance.value === 'system') {
        applyAppearance()
      }
    })
  }

  return {
    appearance,
    characterTheme,

    resolvedAppearance,
    isDark,

    initialize,

    setAppearance,
    setCharacterTheme,

    toggleAppearance,
    toggleCharacterTheme,
  }
})
