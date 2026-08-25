import {
  api,
  type GenerationEvent,
  type IpcErrorPayload,
  toIpcError,
} from '@renderer/services/api'
import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { useStudioStore } from './studio'

export const useGenerationStore = defineStore('generation', () => {
  const requestId = ref<string | null>(null)
  const conversationId = ref<string | null>(null)
  const output = ref('')
  const preparing = ref(false)
  const running = computed(() => preparing.value || requestId.value !== null)
  const error = ref<IpcErrorPayload | null>(null)
  const lastEvent = ref<GenerationEvent | null>(null)
  const events = ref<GenerationEvent[]>([])
  let dispose: (() => void) | null = null
  let preparationAbortRequested = false

  function initialize() {
    dispose?.()
    dispose = api.onGenerationEvent(handleEvent)
  }

  async function start(input: {
    characterId: string
    providerId: string
    text: string
    model?: string
    temperature?: number
    maxOutputTokens?: number
    characterRevisionId?: string
    conversationId?: string
    contextOverride?: {
      includeCharacterLorebooks: boolean
      lorebookRevisionIds: readonly string[]
    }
    allowDraftCharacterRevision?: boolean
    cleanupConversationOnFailure?: boolean
  }) {
    const studio = useStudioStore()
    error.value = null
    output.value = ''
    events.value = []
    lastEvent.value = null
    if (running.value) throw new Error('已有生成任务正在进行')
    preparing.value = true
    preparationAbortRequested = false
    let createdConversationId: string | null = null
    try {
      const character = await api.getCharacter({
        characterId: input.characterId,
      })
      const revision = input.characterRevisionId ?? character?.currentRevisionId
      if (!character || !revision) throw new Error('所选角色没有可用版本')
      const existingConversation = input.conversationId
        ? await api.getConversation({ conversationId: input.conversationId })
        : null
      const conversation =
        existingConversation ??
        (input.characterRevisionId
          ? await api.createTestConversation({
              ownerDisplayName:
                localStorage.getItem('kirika-profile-name') || '我',
              allowDraftCharacterRevision:
                input.allowDraftCharacterRevision === true,
              characters: [
                {
                  characterId: character.id,
                  characterRevisionId: revision,
                  displayName:
                    character.revisions.find((item) => item.id === revision)
                      ?.name ?? '角色',
                },
              ],
            })
          : await api.createConversation({
              ownerDisplayName:
                localStorage.getItem('kirika-profile-name') || '我',
              characters: [
                {
                  characterId: character.id,
                  characterRevisionId: revision,
                  displayName:
                    character.revisions.find((item) => item.id === revision)
                      ?.name ?? '角色',
                },
              ],
            }))
      if (!existingConversation) createdConversationId = conversation.id
      conversationId.value = conversation.id
      await api.sendHumanMessage({
        conversationId: conversation.id,
        content: input.text,
      })
      if (preparationAbortRequested) {
        if (createdConversationId)
          await api.deleteConversation({
            conversationId: createdConversationId,
          })
        conversationId.value = null
        return
      }
      const nextRequestId = crypto.randomUUID()
      requestId.value = nextRequestId
      const request = {
        requestId: nextRequestId,
        conversationId: conversation.id,
        providerId: input.providerId,
        model: input.model,
        generation: {
          temperature: input.temperature,
          maxOutputTokens: input.maxOutputTokens,
        },
      }
      const result = input.contextOverride
        ? await api.startTestGeneration({
            ...request,
            characterId: character.id,
            characterRevisionId: revision,
            contextOverride: input.contextOverride,
          })
        : await api.startGeneration(request)
      if (result.requestId !== nextRequestId)
        throw new Error('生成请求 ID 不一致')
      preparing.value = false
      if (preparationAbortRequested)
        await api.abortGeneration({ requestId: nextRequestId })
      void studio.refreshResources().catch(() => undefined)
    } catch (cause) {
      if (input.cleanupConversationOnFailure && createdConversationId)
        await api
          .deleteConversation({ conversationId: createdConversationId })
          .catch(() => undefined)
      error.value = toIpcError(cause)
      preparing.value = false
      requestId.value = null
    }
  }

  function clearRun() {
    output.value = ''
    events.value = []
    lastEvent.value = null
    error.value = null
  }

  async function abort() {
    preparationAbortRequested = true
    preparing.value = false
    const activeRequestId = requestId.value
    requestId.value = null
    if (!activeRequestId) return
    await api.abortGeneration({ requestId: activeRequestId })
  }

  function handleEvent(event: GenerationEvent) {
    if (
      preparationAbortRequested ||
      !requestId.value ||
      event.requestId !== requestId.value
    )
      return
    lastEvent.value = event
    events.value.push(event)
    if (event.type === 'text_delta') output.value += event.delta
    if (event.type === 'failed')
      error.value = { code: 'MODEL', message: event.reason }
    if (
      event.type === 'completed' ||
      event.type === 'failed' ||
      event.type === 'cancelled'
    )
      requestId.value = null
  }

  return {
    requestId,
    preparing,
    conversationId,
    output,
    running,
    error,
    lastEvent,
    events,
    initialize,
    clearRun,
    start,
    abort,
  }
})
