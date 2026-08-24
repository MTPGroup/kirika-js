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
  const running = computed(() => requestId.value !== null)
  const error = ref<IpcErrorPayload | null>(null)
  const lastEvent = ref<GenerationEvent | null>(null)
  let dispose: (() => void) | null = null

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
  }) {
    const studio = useStudioStore()
    error.value = null
    output.value = ''
    if (requestId.value) throw new Error('已有生成任务正在进行')
    try {
      const character = await api.getCharacter({
        characterId: input.characterId,
      })
      const revision = character?.currentRevisionId
      if (!character || !revision) throw new Error('所选角色还没有已发布版本')
      const conversation = await api.createConversation({
        ownerDisplayName: localStorage.getItem('kirika-profile-name') || '我',
        characters: [
          {
            characterId: character.id,
            characterRevisionId: revision,
            displayName:
              character.revisions.find((item) => item.id === revision)?.name ??
              '角色',
          },
        ],
      })
      conversationId.value = conversation.id
      await api.sendHumanMessage({
        conversationId: conversation.id,
        content: input.text,
      })
      const nextRequestId = crypto.randomUUID()
      requestId.value = nextRequestId
      const result = await api.startGeneration({
        requestId: nextRequestId,
        conversationId: conversation.id,
        providerId: input.providerId,
        model: input.model,
        generation: {
          temperature: input.temperature,
          maxOutputTokens: input.maxOutputTokens,
        },
      })
      if (result.requestId !== nextRequestId)
        throw new Error('生成请求 ID 不一致')
      void studio.refreshResources().catch(() => undefined)
    } catch (cause) {
      error.value = toIpcError(cause)
      requestId.value = null
    }
  }

  async function abort() {
    if (!requestId.value) return
    await api.abortGeneration({ requestId: requestId.value })
  }

  function handleEvent(event: GenerationEvent) {
    if (!requestId.value || event.requestId !== requestId.value) return
    lastEvent.value = event
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
    conversationId,
    output,
    running,
    error,
    lastEvent,
    initialize,
    start,
    abort,
  }
})
