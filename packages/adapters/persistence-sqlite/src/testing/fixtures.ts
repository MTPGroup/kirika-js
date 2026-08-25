import {
  Character,
  type CharacterRevision,
} from '@kirika-js/core/domain/character'
import {
  Conversation,
  ConversationParticipant,
} from '@kirika-js/core/domain/conversation'
import { UserId } from '@kirika-js/core/domain/shared'

import { SqliteCharacterRepository } from '~/repositories/character.repository'
import { SqliteConversationRepository } from '~/repositories/conversation.repository'
import { users } from '~/schema'
import type { TestDatabase } from '~/testing/create-test-database'

export async function seedUser(
  db: TestDatabase,
  name = 'Hana',
): Promise<UserId> {
  const id = UserId.generate()

  await db.insert(users).values({
    id: id.value,
    name,
  })

  return id
}

export async function seedPublishedCharacter(
  db: TestDatabase,
  ownerId: UserId,
): Promise<{
  character: Character
  revision: CharacterRevision
}> {
  const repository = new SqliteCharacterRepository(db)

  const character = Character.create({
    ownerId,

    initialRevision: {
      name: 'Luna',
      description: 'Moon witch',
      greetings: ['Hello.'],
    },
  })

  const draft = character.draftRevision
  if (!draft) {
    throw new Error('测试角色缺少草稿版本')
  }

  await repository.save(character)

  character.publishRevision(draft.id)

  await repository.save(character)

  const revision = character.currentRevision

  if (!revision) {
    throw new Error('测试角色发布失败')
  }

  return {
    character,
    revision,
  }
}

export async function seedConversation(db: TestDatabase) {
  const ownerId = await seedUser(db)

  const { character, revision } = await seedPublishedCharacter(db, ownerId)

  const owner = ConversationParticipant.createHuman({
    userId: ownerId,
    displayName: 'Hana',
    role: 'owner',
  })

  const characterParticipant = ConversationParticipant.createCharacter({
    characterId: character.id,
    characterRevisionId: revision.id,
    displayName: 'Luna',
  })

  const conversation = Conversation.create({
    ownerId,
    mode: 'direct',
    participants: [owner, characterParticipant],
    title: 'Test chat',
  })

  const repository = new SqliteConversationRepository(db)

  await repository.save(conversation)

  return {
    ownerId,
    character,
    revision,
    owner,
    characterParticipant,
    conversation,
  }
}
