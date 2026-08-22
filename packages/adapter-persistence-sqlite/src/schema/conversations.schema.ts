import { sql } from 'drizzle-orm'
import {
  type AnySQLiteColumn,
  check,
  index,
  integer,
  sqliteTable,
  text,
  uniqueIndex,
} from 'drizzle-orm/sqlite-core'
import { characterRevisions, characters } from './character.schema'
import { users } from './user.schema'

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
  | {
      type: 'text'
      text: string
    }
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

export const conversations = sqliteTable(
  'conversations',
  {
    id: text('id').primaryKey(),

    ownerId: text('owner_id')
      .notNull()
      .references(() => users.id, {
        onDelete: 'cascade',
      }),

    mode: text('mode', {
      enum: CONVERSATION_MODES,
    }).notNull(),

    title: text('title'),

    status: text('status', {
      enum: CONVERSATION_STATUSES,
    })
      .notNull()
      .default('active'),

    turnPolicy: text('turn_policy', {
      enum: CONVERSATION_TURN_POLICIES,
    })
      .notNull()
      .default('manual'),

    // 和 Character.currentRevisionId 一样采用 soft reference，
    // 避免 conversations <-> messages 的循环 FK。
    activeLeafMessageId: text('active_leaf_message_id'),

    activeGenerationMessageId: text('active_generation_message_id'),

    createdAt: integer('created_at', {
      mode: 'timestamp_ms',
    })
      .notNull()
      .default(sql`(unixepoch() * 1000)`),

    updatedAt: integer('updated_at', {
      mode: 'timestamp_ms',
    })
      .notNull()
      .default(sql`(unixepoch() * 1000)`),

    archivedAt: integer('archived_at', {
      mode: 'timestamp_ms',
    }),
  },
  (t) => [
    index('conversations_owner_updated_at_idx').on(
      t.ownerId,
      t.updatedAt,
      t.id,
    ),

    check('conversations_mode_check', sql`${t.mode} in ('direct', 'group')`),

    check(
      'conversations_status_check',
      sql`${t.status} in ('active', 'archived')`,
    ),

    check(
      'conversations_turn_policy_check',
      sql`${t.turnPolicy} in ('manual', 'round_robin', 'auto')`,
    ),
  ],
)

export const conversationParticipants = sqliteTable(
  'conversation_participants',
  {
    id: text('id').primaryKey(),

    conversationId: text('conversation_id')
      .notNull()
      .references(() => conversations.id, {
        onDelete: 'cascade',
      }),

    type: text('type', {
      enum: CONVERSATION_PARTICIPANT_TYPES,
    }).notNull(),

    role: text('role', {
      enum: CONVERSATION_PARTICIPANT_ROLES,
    }).notNull(),

    status: text('status', {
      enum: CONVERSATION_PARTICIPANT_STATUSES,
    })
      .notNull()
      .default('active'),

    userId: text('user_id').references(() => users.id),

    characterId: text('character_id').references(() => characters.id),

    characterRevisionId: text('character_revision_id').references(
      () => characterRevisions.id,
    ),

    displayName: text('display_name').notNull(),

    joinedAt: integer('joined_at', {
      mode: 'timestamp_ms',
    }).notNull(),

    leftAt: integer('left_at', {
      mode: 'timestamp_ms',
    }),
  },
  (t) => [
    index('conversation_participants_conversation_idx').on(t.conversationId),

    uniqueIndex('conversation_participants_user_uq')
      .on(t.conversationId, t.userId)
      .where(sql`${t.userId} is not null`),

    uniqueIndex('conversation_participants_character_uq')
      .on(t.conversationId, t.characterRevisionId)
      .where(sql`${t.characterRevisionId} is not null`),

    check(
      'conversation_participants_reference_check',
      sql`
        (
          ${t.type} = 'human'
          and ${t.userId} is not null
          and ${t.characterId} is null
          and ${t.characterRevisionId} is null
        )
        or
        (
          ${t.type} = 'character'
          and ${t.userId} is null
          and ${t.characterId} is not null
          and ${t.characterRevisionId} is not null
        )
      `,
    ),
  ],
)

export const conversationMessages = sqliteTable(
  'conversation_messages',
  {
    id: text('id').primaryKey(),

    conversationId: text('conversation_id')
      .notNull()
      .references(() => conversations.id, {
        onDelete: 'cascade',
      }),

    parentMessageId: text('parent_message_id').references(
      (): AnySQLiteColumn => conversationMessages.id,
    ),

    authorParticipantId: text('author_participant_id')
      .notNull()
      .references(() => conversationParticipants.id),

    source: text('source', {
      enum: CONVERSATION_MESSAGE_SOURCES,
    }).notNull(),

    status: text('status', {
      enum: CONVERSATION_MESSAGE_STATUSES,
    }).notNull(),

    content: text('content', {
      mode: 'json',
    })
      .$type<PersistedMessageContentPart[]>()
      .notNull()
      .default(sql`'[]'`),

    model: text('model'),

    finishReason: text('finish_reason', {
      enum: GENERATION_FINISH_REASONS,
    }),

    tokenUsage: text('token_usage', {
      mode: 'json',
    }).$type<PersistedTokenUsage>(),

    errorReason: text('error_reason'),

    createdAt: integer('created_at', {
      mode: 'timestamp_ms',
    }).notNull(),

    updatedAt: integer('updated_at', {
      mode: 'timestamp_ms',
    }).notNull(),
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
