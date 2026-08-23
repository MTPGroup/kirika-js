import { defineStore } from 'pinia'
import { computed, ref } from 'vue'

export type Theme = 'light' | 'dark' | 'system'

const STORAGE_KEY = 'kirika-theme'

export const useThemeStore = defineStore('theme', () => {
  const theme = ref<Theme>('system')

  const systemDark = ref(false)

  const resolvedTheme = computed<'light' | 'dark'>(() => {
    if (theme.value === 'system') {
      return systemDark.value ? 'dark' : 'light'
    }

    return theme.value
  })

  function apply() {
    const root = document.documentElement
    const dark = resolvedTheme.value === 'dark'

    root.classList.toggle('dark', dark)
    root.style.colorScheme = dark ? 'dark' : 'light'
  }

  function setTheme(value: Theme) {
    theme.value = value
    localStorage.setItem(STORAGE_KEY, value)
    apply()
  }

  function toggle() {
    setTheme(resolvedTheme.value === 'dark' ? 'light' : 'dark')
  }

  function initialize() {
    const media = window.matchMedia('(prefers-color-scheme: dark)')

    systemDark.value = media.matches

    const stored = localStorage.getItem(STORAGE_KEY)

    if (stored === 'light' || stored === 'dark' || stored === 'system') {
      theme.value = stored
    }

    apply()

    media.addEventListener('change', (event) => {
      systemDark.value = event.matches

      if (theme.value === 'system') {
        apply()
      }
    })
  }

  return {
    theme,
    resolvedTheme,
    initialize,
    setTheme,
    toggle,
  }
})
