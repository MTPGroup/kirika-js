const activeGenerations = new Map<string, AbortController>()

export function registerGeneration(
  conversationId: string,
  controller: AbortController,
): void {
  activeGenerations.set(conversationId, controller)
}

export function unregisterGeneration(conversationId: string): void {
  activeGenerations.delete(conversationId)
}

export function stopGeneration(conversationId: string): boolean {
  const controller = activeGenerations.get(conversationId)
  if (!controller) return false
  controller.abort()
  return true
}
