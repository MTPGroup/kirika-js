import { sql } from 'drizzle-orm'
import {
  check,
  index,
  integer,
  primaryKey,
  sqliteTable,
  text,
  uniqueIndex,
} from 'drizzle-orm/sqlite-core'

import { assets } from './asset.schema'
import { lorebookRevisions } from './lorebook.schema'
import type { Extensions } from './shared.schema'
import { users } from './user.schema'

export const characters = sqliteTable(
  'characters',
  {
    id: text('id').primaryKey(),

    ownerId: text('owner_id')
      .notNull()
      .references(() => users.id, {
        onDelete: 'cascade',
      }),

    currentRevisionId: text('current_revision_id'),

    alias: text('alias'),

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
    index('characters_owner_updated_at_idx').on(t.ownerId, t.updatedAt, t.id),
  ],
)

export const characterRevisions = sqliteTable(
  'character_revisions',
  {
    id: text('id').primaryKey(),

    characterId: text('character_id')
      .notNull()
      .references(() => characters.id, {
        onDelete: 'cascade',
      }),

    revisionNumber: integer('revision_number').notNull(),

    isDraft: integer('is_draft', {
      mode: 'boolean',
    })
      .notNull()
      .default(true),

    name: text('name').notNull(),

    description: text('description').notNull().default(''),

    personality: text('personality').notNull().default(''),

    scenario: text('scenario').notNull().default(''),

    systemPrompt: text('system_prompt').notNull().default(''),

    postHistoryInstructions: text('post_history_instructions')
      .notNull()
      .default(''),

    greetings: text('greetings', {
      mode: 'json',
    })
      .$type<string[]>()
      .notNull()
      .default(sql`'[]'`),

    examples: text('examples', {
      mode: 'json',
    })
      .$type<string[]>()
      .notNull()
      .default(sql`'[]'`),

    extensions: text('extensions', {
      mode: 'json',
    })
      .$type<Extensions>()
      .notNull()
      .default(sql`'{}'`),

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
    uniqueIndex('character_revision_number_uq').on(
      t.characterId,
      t.revisionNumber,
    ),

    uniqueIndex('character_single_draft_uq')
      .on(t.characterId)
      .where(sql`${t.isDraft} = 1`),
  ],
)

export const ASSET_KINDS = [
  'avatar',
  'background',
  'emotion',
  'audio',
  'video',
  'model',
  'other',
] as const

export type AssetKind = (typeof ASSET_KINDS)[number]

export const characterRevisionAssets = sqliteTable(
  'character_revision_assets',
  {
    revisionId: text('revision_id')
      .notNull()
      .references(() => characterRevisions.id, {
        onDelete: 'cascade',
      }),

    assetId: text('asset_id')
      .notNull()
      .references(() => assets.id),

    kind: text('kind', {
      enum: ASSET_KINDS,
    }).notNull(),

    name: text('name').notNull(),

    uri: text('uri').notNull(),

    ordinal: integer('ordinal').notNull(),

    extensions: text('extensions', {
      mode: 'json',
    })
      .$type<Extensions>()
      .notNull()
      .default(sql`'{}'`),
  },
  (t) => [
    primaryKey({
      name: 'character_revision_assets_pkey',
      columns: [t.revisionId, t.kind, t.ordinal],
    }),

    index('character_revision_assets_asset_idx').on(t.assetId),

    check(
      'character_revision_assets_kind_check',
      sql`${t.kind} in (
        'avatar',
        'background',
        'emotion',
        'audio',
        'video',
        'model',
        'other'
      )`,
    ),
  ],
)

export const characterRevisionLorebooks = sqliteTable(
  'character_revision_lorebooks',
  {
    characterRevisionId: text('character_revision_id')
      .notNull()
      .references(() => characterRevisions.id, {
        onDelete: 'cascade',
      }),

    lorebookRevisionId: text('lorebook_revision_id')
      .notNull()
      .references(() => lorebookRevisions.id),

    ordinal: integer('ordinal').notNull(),

    enabled: integer('enabled', {
      mode: 'boolean',
    })
      .notNull()
      .default(true),
  },
  (t) => [
    primaryKey({
      name: 'character_revision_lorebooks_pkey',
      columns: [t.characterRevisionId, t.lorebookRevisionId],
    }),

    uniqueIndex('character_revision_lorebook_ordinal_uq').on(
      t.characterRevisionId,
      t.ordinal,
    ),

    index('character_revision_lorebook_revision_idx').on(t.lorebookRevisionId),
  ],
)
