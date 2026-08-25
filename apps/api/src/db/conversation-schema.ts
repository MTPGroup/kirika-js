import { sql } from 'drizzle-orm'
import {
  index,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core'
import { users } from './auth-schema.js'
import { characterRevisions, characters } from './character-schema.js'

export const CONVERSATION_MODES = ['direct', 'group'] as const
export const CONVERSATION_STATUSES = ['active', 'archived'] as const
export const CONVERSATION_TURN_POLICIES = [
  'manual',
  'round_robin',
  'auto',
] as const
export const CONVERSATION_PARTICIPANT_TYPES = ['human', 'character'] as const
export const CONVERSATION_PARTICIPANT_ROLES = ['owner', 'member'] as const
export const CONVERSATION_PARTICIPANT_STATUSES = ['active', 'left'] as const
export const CONVERSATION_MESSAGE_SOURCES = [
  'human',
  'greeting',
  'generated',
] as const
export const CONVERSATION_MESSAGE_STATUSES = [
  'pending',
  'streaming',
  'completed',
  'failed',
  'cancelled',
] as const
export const GENERATION_FINISH_REASONS = [
  'stop',
  'length',
  'content_filter',
  'error',
  'cancelled',
] as const

export type PersistedMessageContentPart =
  | { type: 'text'; text: string }
  | {
      type: 'asset'
      assetId: string
      modality: 'image' | 'audio' | 'video' | 'file'
      mediaType: string
      altText: string | null
    }

export interface PersistedTokenUsage {
  promptTokens: number
  completionTokens: number
}

export const conversations = pgTable(
  'conversations',
  {
    id: uuid('id').primaryKey(),
    ownerId: uuid('owner_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    mode: text('mode', { enum: CONVERSATION_MODES }).notNull(),
    title: text('title'),
    status: text('status', { enum: CONVERSATION_STATUSES })
      .notNull()
      .default('active'),
    turnPolicy: text('turn_policy', { enum: CONVERSATION_TURN_POLICIES })
      .notNull()
      .default('manual'),
    // soft reference，避免 conversations <-> messages 循环 FK
    activeLeafMessageId: uuid('active_leaf_message_id'),
    activeGenerationMessageId: uuid('active_generation_message_id'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at')
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
    archivedAt: timestamp('archived_at'),
  },
  (t) => [
    index('conversations_owner_updated_at_idx').on(
      t.ownerId,
      t.updatedAt,
      t.id,
    ),
  ],
)

export const conversationParticipants = pgTable(
  'conversation_participants',
  {
    id: uuid('id').primaryKey(),
    conversationId: uuid('conversation_id')
      .notNull()
      .references(() => conversations.id, { onDelete: 'cascade' }),
    type: text('type', { enum: CONVERSATION_PARTICIPANT_TYPES }).notNull(),
    role: text('role', { enum: CONVERSATION_PARTICIPANT_ROLES }).notNull(),
    status: text('status', { enum: CONVERSATION_PARTICIPANT_STATUSES })
      .notNull()
      .default('active'),
    userId: uuid('user_id').references(() => users.id),
    characterId: uuid('character_id').references(() => characters.id),
    characterRevisionId: uuid('character_revision_id').references(
      () => characterRevisions.id,
    ),
    displayName: text('display_name').notNull(),
    joinedAt: timestamp('joined_at').notNull(),
    leftAt: timestamp('left_at'),
  },
  (t) => [
    index('conversation_participants_conversation_idx').on(t.conversationId),
    uniqueIndex('conversation_participants_user_uq')
      .on(t.conversationId, t.userId)
      .where(sql`${t.userId} is not null`),
    uniqueIndex('conversation_participants_character_uq')
      .on(t.conversationId, t.characterRevisionId)
      .where(sql`${t.characterRevisionId} is not null`),
  ],
)

export const conversationMessages = pgTable(
  'conversation_messages',
  {
    id: uuid('id').primaryKey(),
    conversationId: uuid('conversation_id')
      .notNull()
      .references(() => conversations.id, { onDelete: 'cascade' }),
    // soft reference，消息树由领域层通过 findPathToRoot 维护
    parentMessageId: uuid('parent_message_id'),
    authorParticipantId: uuid('author_participant_id')
      .notNull()
      .references(() => conversationParticipants.id),
    source: text('source', { enum: CONVERSATION_MESSAGE_SOURCES }).notNull(),
    status: text('status', { enum: CONVERSATION_MESSAGE_STATUSES }).notNull(),
    content: jsonb('content')
      .$type<PersistedMessageContentPart[]>()
      .notNull()
      .default([]),
    model: text('model'),
    finishReason: text('finish_reason', { enum: GENERATION_FINISH_REASONS }),
    tokenUsage: jsonb('token_usage').$type<PersistedTokenUsage>(),
    errorReason: text('error_reason'),
    createdAt: timestamp('created_at').notNull(),
    updatedAt: timestamp('updated_at').notNull(),
  },
  (t) => [
    index('conversation_messages_conversation_idx').on(
      t.conversationId,
      t.createdAt,
      t.id,
    ),
    index('conversation_messages_parent_idx').on(t.parentMessageId),
  ],
)
