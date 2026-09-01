import {
  api,
  type CharacterSummaryDto,
  type ConversationSummaryDto,
  type IpcErrorPayload,
  type LorebookSummaryDto,
  type ProviderDto,
  toIpcError,
  type WorkspaceStateDto,
} from '@renderer/services/api'
import { defineStore } from 'pinia'
import { computed, ref } from 'vue'

export const useStudioStore = defineStore('studio', () => {
  const workspace = ref<WorkspaceStateDto | null>(null)
  const characters = ref<readonly CharacterSummaryDto[]>([])
  const lorebooks = ref<readonly LorebookSummaryDto[]>([])
  const conversations = ref<readonly ConversationSummaryDto[]>([])
  const providers = ref<readonly ProviderDto[]>([])
  const recentWorkspaces = ref<readonly string[]>([])
  const loading = ref(false)
  const error = ref<IpcErrorPayload | null>(null)
  const isOpen = computed(() => workspace.value !== null)

  async function initialize() {
    await execute(async () => {
      recentWorkspaces.value = await api.listRecentWorkspaces()
      workspace.value = await api.getWorkspaceState()
      if (workspace.value) await refreshResources()
    })
  }

  async function refreshProviders() {
    if (!workspace.value) return
    providers.value = await api.listProviders()
  }

  async function refreshLorebooks() {
    if (!workspace.value) return
    lorebooks.value = await api.listLorebooks()
  }

  async function refreshResources() {
    if (!workspace.value) return
    const [nextCharacters, nextLorebooks, nextConversations, nextProviders] = await Promise.all([
      api.listCharacters(),
      api.listLorebooks(),
      api.listConversations(),
      api.listProviders(),
    ])
    characters.value = nextCharacters
    lorebooks.value = nextLorebooks
    conversations.value = nextConversations
    providers.value = nextProviders
  }

  async function openWorkspace(path: string, create = false, name?: string) {
    await execute(async () => {
      workspace.value = create
        ? await api.createWorkspace({ path, name })
        : await api.openWorkspace({ path })
      await refreshResources()
      recentWorkspaces.value = await api.listRecentWorkspaces()
    })
  }

  async function closeWorkspace() {
    await execute(async () => {
      await api.closeWorkspace()
      workspace.value = null
      characters.value = []
      lorebooks.value = []
      conversations.value = []
      providers.value = []
    })
  }

  async function execute<T>(operation: () => Promise<T>): Promise<T | undefined> {
    loading.value = true
    error.value = null
    try {
      return await operation()
    } catch (cause) {
      error.value = toIpcError(cause)
      return undefined
    } finally {
      loading.value = false
    }
  }

  return {
    workspace,
    characters,
    lorebooks,
    conversations,
    providers,
    recentWorkspaces,
    loading,
    error,
    isOpen,
    initialize,
    refreshResources,
    refreshProviders,
    refreshLorebooks,
    openWorkspace,
    closeWorkspace,
    execute,
  }
})
