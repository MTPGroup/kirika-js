import './assets/style.css'

import { createPinia } from 'pinia'
import { createApp } from 'vue'
import App from './App.vue'
import { router } from './router'
import { useGenerationStore } from './stores/generation'
import { useStudioStore } from './stores/studio'
import { useThemeStore } from './stores/theme'

const app = createApp(App)
const pinia = createPinia()

app.use(pinia)
app.use(router)

useThemeStore(pinia).initialize()
void useStudioStore(pinia).initialize()
useGenerationStore(pinia).initialize()

app.mount('#app')
