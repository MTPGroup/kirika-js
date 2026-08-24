import {
  AssetId,
  CharacterId,
  CharacterRevisionId,
} from '@kirika-js/domain/character'
import {
  Conversation,
  ConversationId,
  ConversationMessageId,
  ConversationParticipant,
  ConversationParticipantId,
  MessageContent,
} from '@kirika-js/domain/conversation'
import { UserId } from '@kirika-js/domain/shared'
import type { ConversationApi, MessageContentInput } from '~/shared/ipc'
import {
  toConversationDto,
  toConversationMessageDto,
  toConversationSummaryDto,
} from '../mappers/ipc-dto.mapper'
import { studioRuntime } from '../studio-runtime'

async function load(id: string) {
  const runtime = studioRuntime.requireActive()
  const conversation = await runtime.conversationRepository.findById(
    new ConversationId(id),
  )
  if (!conversation) throw new Error('会话不存在')
  return { runtime, conversation }
}
async function save(
  runtime: ReturnType<typeof studioRuntime.requireActive>,
  conversation: Conversation,
) {
  await runtime.conversationRepository.save(conversation)
  return toConversationDto(conversation)
}
function content(input: MessageContentInput): MessageContent {
  return typeof input === 'string'
    ? MessageContent.fromText(input)
    : MessageContent.create(
        input.map((p) =>
          p.type === 'text' ? p : { ...p, assetId: new AssetId(p.assetId) },
        ),
      )
}
async function verifyCharacter(
  runtime: ReturnType<typeof studioRuntime.requireActive>,
  characterId: string,
  revisionId: string,
) {
  const character = await runtime.characterRepository.findById(
    new CharacterId(characterId),
  )
  const revision = character?.findRevision(new CharacterRevisionId(revisionId))
  if (!revision) throw new Error('角色或固定角色版本不存在')
  if (revision.isDraft) throw new Error('会话只能使用已发布角色版本')
  return revision
}

export const conversationService: ConversationApi = {
  async listConversations() {
    const runtime = studioRuntime.requireActive()
    const values = await runtime.conversationRepository.findAll()
    return Promise.all(
      values
        .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime())
        .map(async (v) =>
          toConversationSummaryDto(
            v,
            await runtime.messageRepository.countByConversation(v.id),
          ),
        ),
    )
  },
  async createConversation(input) {
    const runtime = studioRuntime.requireActive()
    const revisions = await Promise.all(
      input.characters.map((c) =>
        verifyCharacter(runtime, c.characterId, c.characterRevisionId),
      ),
    )
    const ownerId = new UserId(runtime.settings.ownerId)
    const participants = [
      ConversationParticipant.createHuman({
        userId: ownerId,
        displayName: input.ownerDisplayName,
        role: 'owner',
      }),
      ...input.characters.map((c) =>
        ConversationParticipant.createCharacter({
          characterId: new CharacterId(c.characterId),
          characterRevisionId: new CharacterRevisionId(c.characterRevisionId),
          displayName: c.displayName,
        }),
      ),
    ]
    const mode =
      input.mode ?? (input.characters.length === 1 ? 'direct' : 'group')
    const conversation = Conversation.create({
      ownerId,
      mode,
      participants,
      title: input.title,
      turnPolicy: input.turnPolicy,
    })
    if (mode === 'direct') {
      const revision = revisions[0]
      const speaker = conversation.activeParticipants.find(
        (participant) => participant.type === 'character',
      )
      const greeting = revision?.greetings[0]
      if (speaker && greeting) {
        const message = conversation.createGreetingMessage(
          speaker.id,
          MessageContent.fromText(greeting),
          null,
        )
        await runtime.conversationUnitOfWork.createWithMessage(
          conversation,
          message,
        )
        return toConversationDto(conversation)
      }
    }
    await runtime.conversationRepository.save(conversation)
    return toConversationDto(conversation)
  },
  async getConversation(input) {
    const value = await studioRuntime
      .requireActive()
      .conversationRepository.findById(new ConversationId(input.conversationId))
    return value ? toConversationDto(value) : null
  },
  async getConversationHistory(input) {
    const { runtime, conversation } = await load(input.conversationId)
    const leaf = input.leafMessageId
      ? new ConversationMessageId(input.leafMessageId)
      : conversation.activeLeafMessageId
    if (!leaf) return { path: [] }
    return {
      path: (
        await runtime.messageRepository.findPathToRoot(conversation.id, leaf)
      ).map(toConversationMessageDto),
    }
  },
  async deleteConversation(input) {
    await studioRuntime
      .requireActive()
      .conversationRepository.delete(new ConversationId(input.conversationId))
  },
  async renameConversation(input) {
    const { runtime, conversation } = await load(input.conversationId)
    conversation.rename(input.title)
    return save(runtime, conversation)
  },
  async changeConversationTurnPolicy(input) {
    const { runtime, conversation } = await load(input.conversationId)
    conversation.changeTurnPolicy(input.turnPolicy)
    return save(runtime, conversation)
  },
  async addCharacterParticipant(input) {
    const { runtime, conversation } = await load(input.conversationId)
    await verifyCharacter(
      runtime,
      input.participant.characterId,
      input.participant.characterRevisionId,
    )
    if (conversation.mode === 'direct') conversation.convertToGroup()
    conversation.addParticipant(
      ConversationParticipant.createCharacter({
        characterId: new CharacterId(input.participant.characterId),
        characterRevisionId: new CharacterRevisionId(
          input.participant.characterRevisionId,
        ),
        displayName: input.participant.displayName,
      }),
    )
    return save(runtime, conversation)
  },
  async removeConversationParticipant(input) {
    const { runtime, conversation } = await load(input.conversationId)
    conversation.removeParticipant(
      new ConversationParticipantId(input.participantId),
    )
    return save(runtime, conversation)
  },
  async renameConversationParticipant(input) {
    const { runtime, conversation } = await load(input.conversationId)
    conversation.renameParticipant(
      new ConversationParticipantId(input.participantId),
      input.displayName,
    )
    return save(runtime, conversation)
  },
  async sendHumanMessage(input) {
    const { runtime, conversation } = await load(input.conversationId)
    const author = conversation.activeParticipants.find(
      (p) => p.type === 'human' && p.role === 'owner',
    )
    if (!author) throw new Error('会话所有者不存在')
    const parentId =
      input.parentMessageId === undefined
        ? conversation.activeLeafMessageId
        : input.parentMessageId
          ? new ConversationMessageId(input.parentMessageId)
          : null
    const parent = parentId
      ? await runtime.messageRepository.findById(parentId)
      : null
    const message = conversation.createHumanMessage(
      author.id,
      content(input.content),
      parent,
    )
    await runtime.conversationUnitOfWork.appendMessage(conversation, message)
    return toConversationMessageDto(message)
  },
  async selectConversationBranch(input) {
    const { runtime, conversation } = await load(input.conversationId)
    const id = new ConversationMessageId(input.leafMessageId)
    const message = await runtime.messageRepository.findById(id)
    if (!message) throw new Error('消息不存在')
    conversation.selectMessageBranch(
      message,
      await runtime.messageRepository.hasChildren(id),
    )
    return save(runtime, conversation)
  },
  async archiveConversation(input) {
    const { runtime, conversation } = await load(input.conversationId)
    conversation.archive()
    return save(runtime, conversation)
  },
  async restoreConversation(input) {
    const { runtime, conversation } = await load(input.conversationId)
    conversation.restore()
    return save(runtime, conversation)
  },
}
