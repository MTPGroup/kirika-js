import {
  CharacterId,
  CharacterRevision,
  type CharacterRevisionContent,
  CharacterRevisionId,
} from '../../domain/character'
import {
  Conversation,
  ConversationParticipant,
  type ConversationTurnPolicy,
  MessageContent,
} from '../../domain/conversation'
import { UserId } from '../../domain/shared'

export function createDirectFixture() {
  const ownerId = new UserId(crypto.randomUUID())
  const owner = ConversationParticipant.createHuman({
    userId: ownerId,
    displayName: 'Hana',
    role: 'owner',
  })
  const character = ConversationParticipant.createCharacter({
    characterId: new CharacterId(crypto.randomUUID()),
    characterRevisionId: new CharacterRevisionId(crypto.randomUUID()),
    displayName: 'Luna Alias',
  })
  const conversation = Conversation.create({
    ownerId,
    mode: 'direct',
    participants: [owner, character],
  })

  return { conversation, owner, character }
}

export function createGroupFixture(turnPolicy: ConversationTurnPolicy) {
  const direct = createDirectFixture()
  direct.conversation.convertToGroup(turnPolicy)
  const secondCharacter = ConversationParticipant.createCharacter({
    characterId: new CharacterId(crypto.randomUUID()),
    characterRevisionId: new CharacterRevisionId(crypto.randomUUID()),
    displayName: 'Alice',
  })
  direct.conversation.addParticipant(secondCharacter)

  return { ...direct, secondCharacter }
}

export function createRevisionFor(
  participant: ConversationParticipant,
  content: CharacterRevisionContent = { name: participant.displayName },
): CharacterRevision {
  if (!participant.characterRevisionId) {
    throw new Error('测试参与者不是角色')
  }
  const now = new Date()
  return CharacterRevision.reconstitute({
    id: participant.characterRevisionId,
    revisionNumber: 1,
    isDraft: false,
    ...content,
    createdAt: now,
    updatedAt: now,
  })
}

export function text(value: string): MessageContent {
  return MessageContent.fromText(value)
}
