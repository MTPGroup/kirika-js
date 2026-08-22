import type { CharacterRevision } from '@kirika-js/domain/character'
import type {
  Conversation,
  ConversationMessage,
  ConversationParticipant,
  MessageContentPart,
} from '@kirika-js/domain/conversation'
import type {
  LorebookEntry,
  LorebookRevision,
} from '@kirika-js/domain/lorebook'
import { ChatCharacterContextNotFoundError } from '../errors'
import type { ChatModelMessage } from '../model/chat-model'
import type { ResolvedChatCharacterContext } from '../ports/character-context-resolver.port'
import {
  type ChatMacroContext,
  normalizeExtraMacros,
  replaceChatMacros,
} from './macro-replacer'

export interface CompileChatPromptInput {
  readonly conversation: Conversation
  readonly history: readonly ConversationMessage[]
  readonly speaker: ConversationParticipant
  readonly character: ResolvedChatCharacterContext
  readonly defaultSystemPrompt?: string
  readonly defaultPostHistoryInstructions?: string
  readonly extraMacros?: Readonly<Record<string, string>>
}

export class ChatPromptCompiler {
  compile(input: CompileChatPromptInput): readonly ChatModelMessage[] {
    const revision = input.character.revision
    this.assertCharacterContext(input.speaker, revision)

    const owner = input.conversation.activeParticipants.find(
      (participant) => participant.role === 'owner',
    )
    if (!owner) {
      throw new ChatCharacterContextNotFoundError('会话缺少活跃所有者')
    }
    const macroContext: ChatMacroContext = {
      characterName: revision.name,
      userName: owner.displayName,
      speakerName: input.speaker.displayName,
      extra: normalizeExtraMacros(input.extraMacros),
    }
    const loreEntries = this.activateLorebooks(
      revision,
      input.character.lorebooks,
      input.history,
    )
    const beforeHistoryBlocks = [
      resolvePromptOverride(
        revision.systemPrompt,
        input.defaultSystemPrompt,
        macroContext,
      ),
      createCharacterBlock(revision, macroContext),
      createGroupBlock(input.conversation, input.speaker),
      createExamplesBlock(revision, macroContext),
      createLorebookBlock(
        loreEntries.filter((entry) => entry.position === 'before_history'),
        macroContext,
      ),
    ].filter(isNonEmpty)
    const afterHistoryBlocks = [
      createLorebookBlock(
        loreEntries.filter((entry) => entry.position === 'after_history'),
        macroContext,
      ),
      resolvePromptOverride(
        revision.postHistoryInstructions,
        input.defaultPostHistoryInstructions,
        macroContext,
      ),
    ].filter(isNonEmpty)

    const messages: ChatModelMessage[] = []
    if (beforeHistoryBlocks.length > 0) {
      messages.push(systemMessage(beforeHistoryBlocks.join('\n\n')))
    }
    messages.push(
      ...input.history.map((message) =>
        toModelMessage(input.conversation, message, macroContext),
      ),
    )
    if (afterHistoryBlocks.length > 0) {
      messages.push(systemMessage(afterHistoryBlocks.join('\n\n')))
    }

    return messages
  }

  private assertCharacterContext(
    speaker: ConversationParticipant,
    revision: CharacterRevision,
  ): void {
    if (
      speaker.type !== 'character' ||
      !speaker.characterRevisionId?.equals(revision.id)
    ) {
      throw new ChatCharacterContextNotFoundError(
        '解析到的角色版本与当前发言者不一致',
      )
    }
  }

  private activateLorebooks(
    revision: CharacterRevision,
    resolvedLorebooks: readonly LorebookRevision[],
    history: readonly ConversationMessage[],
  ): LorebookEntry[] {
    const lorebooksById = new Map(
      resolvedLorebooks.map((lorebook) => [lorebook.id.value, lorebook]),
    )
    const scanText = history
      .flatMap((message) => message.content.parts)
      .map(contentPartToScanText)
      .filter(isNonEmpty)
      .join('\n')
    const entries: LorebookEntry[] = []

    for (const reference of revision.lorebooks) {
      if (!reference.enabled) continue
      const lorebook = lorebooksById.get(reference.lorebookRevisionId.value)
      if (!lorebook) {
        throw new ChatCharacterContextNotFoundError(
          `未解析角色引用的世界书版本: ${reference.lorebookRevisionId.value}`,
        )
      }
      entries.push(...lorebook.matchEntries(scanText))
    }

    return entries
  }
}

function resolvePromptOverride(
  characterValue: string,
  fallback: string | undefined,
  context: ChatMacroContext,
): string {
  const resolvedFallback = replaceChatMacros(fallback ?? '', context)
  const source = characterValue || fallback || ''
  return replaceChatMacros(source, {
    ...context,
    original: resolvedFallback,
  })
}

function createCharacterBlock(
  revision: CharacterRevision,
  context: ChatMacroContext,
): string {
  const fields = [
    `Name: ${revision.name}`,
    revision.description
      ? `Description: ${replaceChatMacros(revision.description, context)}`
      : '',
    revision.personality
      ? `Personality: ${replaceChatMacros(revision.personality, context)}`
      : '',
    revision.scenario
      ? `Scenario: ${replaceChatMacros(revision.scenario, context)}`
      : '',
  ].filter(isNonEmpty)

  return `[Character]\n${fields.join('\n')}`
}

function createGroupBlock(
  conversation: Conversation,
  speaker: ConversationParticipant,
): string {
  if (conversation.mode !== 'group') return ''
  const participants = conversation.activeParticipants
    .map((participant) => `- ${participant.displayName} (${participant.type})`)
    .join('\n')

  return `[Group Conversation]\nCurrent speaker: ${speaker.displayName}\nParticipants:\n${participants}`
}

function createExamplesBlock(
  revision: CharacterRevision,
  context: ChatMacroContext,
): string {
  if (revision.examples.length === 0) return ''
  return `[Example Dialogues]\n${revision.examples
    .map((example) => replaceChatMacros(example, context))
    .join('\n\n')}`
}

function createLorebookBlock(
  entries: readonly LorebookEntry[],
  context: ChatMacroContext,
): string {
  if (entries.length === 0) return ''
  return `[Relevant Lore]\n${entries
    .map((entry) => replaceChatMacros(entry.content, context))
    .join('\n\n')}`
}

function toModelMessage(
  conversation: Conversation,
  message: ConversationMessage,
  context: ChatMacroContext,
): ChatModelMessage {
  const author = conversation.findParticipant(message.authorParticipantId)
  if (!author) {
    throw new ChatCharacterContextNotFoundError(
      `消息作者不属于会话: ${message.authorParticipantId.value}`,
    )
  }

  return {
    role: author.type === 'human' ? 'user' : 'assistant',
    name: author.displayName,
    content: message.content.parts.map((part) =>
      message.source === 'greeting' && part.type === 'text'
        ? { type: 'text', text: replaceChatMacros(part.text, context) }
        : part,
    ),
  }
}

function systemMessage(content: string): ChatModelMessage {
  return {
    role: 'system',
    content: [{ type: 'text', text: content }],
  }
}

function contentPartToScanText(part: MessageContentPart): string {
  return part.type === 'text' ? part.text : (part.altText ?? '')
}

function isNonEmpty(value: string): boolean {
  return value.trim().length > 0
}
