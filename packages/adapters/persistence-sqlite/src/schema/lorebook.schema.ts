import { sql } from 'drizzle-orm'
import {
  check,
  index,
  integer,
  sqliteTable,
  text,
  uniqueIndex,
} from 'drizzle-orm/sqlite-core'
import type { Extensions } from '~/schema/shared.schema'
import { users } from '~/schema/user.schema'

export const LOREBOOK_ENTRY_POSITIONS = [
  'before_history',
  'after_history',
  'at_depth',
] as const

export type LorebookEntryPosition = (typeof LOREBOOK_ENTRY_POSITIONS)[number]

export const LOREBOOK_VISIBILITIES = ['private', 'unlisted', 'public'] as const

export type LorebookVisibility = (typeof LOREBOOK_VISIBILITIES)[number]

export const lorebooks = sqliteTable(
  'lorebooks',
  {
    id: text('id').primaryKey(),

    ownerId: text('owner_id')
      .notNull()
      .references(() => users.id),

    currentRevisionId: text('current_revision_id'),

    name: text('name').notNull(),

    description: text('description').notNull().default(''),

    extensions: text('extensions', {
      mode: 'json',
    })
      .$type<Extensions>()
      .notNull()
      .default(sql`'{}'`),

    visibility: text('visibility', {
      enum: LOREBOOK_VISIBILITIES,
    })
      .notNull()
      .default('private'),

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
  },
  (t) => [
    index('lorebooks_owner_updated_at_idx').on(t.ownerId, t.updatedAt, t.id),

    index('lorebook_visibility_updated_at_idx').on(
      t.visibility,
      t.updatedAt,
      t.id,
    ),

    check(
      'lorebooks_visibility_check',
      sql`${t.visibility} in ('private', 'unlisted', 'public')`,
    ),
  ],
)

export const lorebookRevisions = sqliteTable(
  'lorebook_revisions',
  {
    id: text('id').primaryKey(),

    lorebookId: text('lorebook_id')
      .notNull()
      .references(() => lorebooks.id, {
        onDelete: 'cascade',
      }),

    revisionNumber: integer('revision_number').notNull(),

    isDraft: integer('is_draft', {
      mode: 'boolean',
    })
      .notNull()
      .default(true),

    changeLog: text('change_log'),

    scanDepth: integer('scan_depth').notNull().default(20),

    tokenBudget: integer('token_budget').notNull().default(2048),

    createdAt: integer('created_at', {
      mode: 'timestamp_ms',
    })
      .notNull()
      .default(sql`(unixepoch() * 1000)`),
  },
  (t) => [
    uniqueIndex('lorebook_revision_number_uq').on(
      t.lorebookId,
      t.revisionNumber,
    ),
  ],
)

export const lorebookEntries = sqliteTable(
  'lorebook_entries',
  {
    id: text('id').primaryKey(),

    revisionId: text('revision_id')
      .notNull()
      .references(() => lorebookRevisions.id, {
        onDelete: 'cascade',
      }),

    keys: text('keys', {
      mode: 'json',
    })
      .$type<string[]>()
      .notNull()
      .default(sql`'[]'`),

    secondaryKeys: text('secondary_keys', { mode: 'json' })
      .$type<string[]>()
      .notNull()
      .default(sql`'[]'`),

    matchMode: text('match_mode', { enum: ['any', 'all'] })
      .notNull()
      .default('any'),

    constant: integer('constant', { mode: 'boolean' }).notNull().default(false),

    caseSensitive: integer('case_sensitive', { mode: 'boolean' })
      .notNull()
      .default(false),

    matchWholeWords: integer('match_whole_words', { mode: 'boolean' })
      .notNull()
      .default(false),

    probability: integer('probability').notNull().default(100),

    insertionDepth: integer('insertion_depth').notNull().default(0),

    title: text('title').notNull(),

    enabled: integer('enabled', {
      mode: 'boolean',
    })
      .notNull()
      .default(true),

    content: text('content').notNull(),

    position: text('position', {
      enum: LOREBOOK_ENTRY_POSITIONS,
    })
      .notNull()
      .default('after_history'),

    priority: integer('priority').notNull().default(0),
  },
  (t) => [
    index('lorebook_entries_revision_priority_idx').on(
      t.revisionId,
      t.priority,
    ),

    check(
      'lorebook_entries_position_check',
      sql`${t.position} in ('before_history', 'after_history', 'at_depth')`,
    ),
  ],
)
