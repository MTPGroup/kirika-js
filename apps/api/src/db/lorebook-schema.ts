import { defineRelationsPart } from 'drizzle-orm'
import {
  boolean,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core'
import { users } from './auth-schema.js'

export const LOREBOOK_VISIBILITIES = ['private', 'unlisted', 'public'] as const
export const LORE_ENTRY_POSITIONS = [
  'before_history',
  'after_history',
  'at_depth',
] as const
export const LORE_ENTRY_MATCH_MODES = ['any', 'all'] as const

export const lorebooks = pgTable(
  'lorebooks',
  {
    id: uuid('id').primaryKey(),
    ownerId: uuid('owner_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    currentRevisionId: uuid('current_revision_id'),
    name: text('name').notNull(),
    description: text('description').notNull().default(''),
    visibility: text('visibility', { enum: LOREBOOK_VISIBILITIES })
      .notNull()
      .default('private'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at')
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (t) => [
    index('lorebooks_owner_updated_at_idx').on(t.ownerId, t.updatedAt, t.id),
    index('lorebooks_visibility_updated_at_idx').on(
      t.visibility,
      t.updatedAt,
      t.id,
    ),
  ],
)

export const lorebookRevisions = pgTable(
  'lorebook_revisions',
  {
    id: uuid('id').primaryKey(),
    lorebookId: uuid('lorebook_id')
      .notNull()
      .references(() => lorebooks.id, { onDelete: 'cascade' }),
    revisionNumber: integer('revision_number').notNull(),
    isDraft: boolean('is_draft').notNull().default(true),
    scanDepth: integer('scan_depth').notNull().default(20),
    tokenBudget: integer('token_budget').notNull().default(2048),
  },
  (t) => [
    uniqueIndex('lorebook_revision_number_uq').on(
      t.lorebookId,
      t.revisionNumber,
    ),
  ],
)

export const lorebookEntries = pgTable(
  'lorebook_entries',
  {
    id: uuid('id').primaryKey(),
    revisionId: uuid('revision_id')
      .notNull()
      .references(() => lorebookRevisions.id, { onDelete: 'cascade' }),
    keys: jsonb('keys').$type<string[]>().notNull().default([]),
    secondaryKeys: jsonb('secondary_keys')
      .$type<string[]>()
      .notNull()
      .default([]),
    title: text('title').notNull(),
    enabled: boolean('enabled').notNull().default(true),
    content: text('content').notNull(),
    position: text('position', { enum: LORE_ENTRY_POSITIONS })
      .notNull()
      .default('after_history'),
    priority: integer('priority').notNull().default(0),
    matchMode: text('match_mode', { enum: LORE_ENTRY_MATCH_MODES })
      .notNull()
      .default('any'),
    constant: boolean('constant').notNull().default(false),
    caseSensitive: boolean('case_sensitive').notNull().default(false),
    matchWholeWords: boolean('match_whole_words').notNull().default(false),
    probability: integer('probability').notNull().default(100),
    insertionDepth: integer('insertion_depth').notNull().default(0),
  },
  (t) => [
    index('lorebook_entries_revision_priority_idx').on(
      t.revisionId,
      t.priority,
    ),
  ],
)

export const lorebookRelations = defineRelationsPart(
  { lorebooks, lorebookRevisions, lorebookEntries },
  (r) => ({
    lorebooks: {
      revisions: r.many.lorebookRevisions({
        from: r.lorebooks.id,
        to: r.lorebookRevisions.lorebookId,
      }),
      currentRevision: r.one.lorebookRevisions({
        from: r.lorebooks.currentRevisionId,
        to: r.lorebookRevisions.id,
        alias: 'lorebookCurrentRevision',
      }),
    },
    lorebookRevisions: {
      entries: r.many.lorebookEntries({
        from: r.lorebookRevisions.id,
        to: r.lorebookEntries.revisionId,
      }),
    },
    lorebookEntries: {},
  }),
)
