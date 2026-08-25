import { ASSET_KINDS } from '@kirika-js/core/domain/character'
import { defineRelationsPart, sql } from 'drizzle-orm'
import {
  bigint,
  boolean,
  bytea,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core'
import { users } from '~/auth/auth.drizzle-schema'
import { lorebookRevisions } from '~/lorebook/infrastructure/persistence/lorebook.drizzle-schema'

export const assetKindEnum = pgEnum('asset_kind', ASSET_KINDS)

export const characters = pgTable(
  'characters',
  {
    id: uuid('id').primaryKey(),
    ownerId: uuid('owner_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    currentRevisionId: uuid('current_revision_id'),
    alias: text('alias'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at')
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (t) => [
    index('characters_owner_updated_at_idx').on(t.ownerId, t.updatedAt, t.id),
  ],
)

export const characterRevisions = pgTable(
  'character_revisions',
  {
    id: uuid('id').primaryKey(),
    characterId: uuid('character_id')
      .notNull()
      .references(() => characters.id, { onDelete: 'cascade' }),
    revisionNumber: integer('revision_number').notNull(),
    isDraft: boolean('is_draft').notNull().default(true),
    name: text('name').notNull(),
    description: text('description').notNull().default(''),
    personality: text('personality').notNull().default(''),
    scenario: text('scenario').notNull().default(''),
    systemPrompt: text('system_prompt').notNull().default(''),
    postHistoryInstructions: text('post_history_instructions')
      .notNull()
      .default(''),
    greetings: text('greetings').array().notNull(),
    examples: text('examples').array().notNull(),
    extensions: jsonb('extensions')
      .$type<Record<string, unknown>>()
      .notNull()
      .default({}),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at')
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (t) => [
    uniqueIndex('character_revision_number_uq').on(
      t.characterId,
      t.revisionNumber,
    ),
    uniqueIndex('character_single_draft_uq')
      .on(t.characterId)
      .where(sql`${t.isDraft} = true`),
  ],
)

export const assets = pgTable(
  'assets',
  {
    id: uuid('id').primaryKey(),
    storageKey: text('storage_key'),
    mediaType: text('media_type'),
    byteSize: bigint('byte_size', { mode: 'number' }),
    sha256: bytea('sha256'),
  },
  (t) => [uniqueIndex('assets_sha256_uq').on(t.sha256)],
)

export const characterRevisionAssets = pgTable(
  'character_revision_assets',
  {
    revisionId: uuid('revision_id')
      .notNull()
      .references(() => characterRevisions.id, { onDelete: 'cascade' }),
    assetId: uuid('asset_id')
      .notNull()
      .references(() => assets.id),
    kind: assetKindEnum('kind').notNull(),
    name: text('name').notNull(),
    uri: text('uri').notNull(),
    ordinal: integer('ordinal').notNull(),
    extensions: jsonb('extensions')
      .$type<Record<string, unknown>>()
      .notNull()
      .default({}),
  },
  (t) => [
    primaryKey({ columns: [t.revisionId, t.kind, t.ordinal] }),
    index('character_revision_assets_asset_idx').on(t.assetId),
  ],
)

export const characterRevisionLorebooks = pgTable(
  'character_revision_lorebooks',
  {
    characterRevisionId: uuid('character_revision_id')
      .notNull()
      .references(() => characterRevisions.id, { onDelete: 'cascade' }),
    lorebookRevisionId: uuid('lorebook_revision_id')
      .notNull()
      .references(() => lorebookRevisions.id),
    ordinal: integer('ordinal').notNull(),
    enabled: boolean('enabled').notNull().default(true),
  },
  (t) => [
    primaryKey({
      columns: [t.characterRevisionId, t.lorebookRevisionId],
    }),
    uniqueIndex('character_revision_lorebook_ordinal_uq').on(
      t.characterRevisionId,
      t.ordinal,
    ),
    index('character_revision_lorebook_revision_idx').on(t.lorebookRevisionId),
  ],
)

export const characterRelations = defineRelationsPart(
  {
    characters,
    characterRevisions,
    assets,
    characterRevisionAssets,
    characterRevisionLorebooks,
    lorebookRevisions,
  },
  (r) => ({
    characters: {
      revisions: r.many.characterRevisions({
        from: r.characters.id,
        to: r.characterRevisions.characterId,
      }),
      currentRevision: r.one.characterRevisions({
        from: r.characters.currentRevisionId,
        to: r.characterRevisions.id,
        alias: 'characterCurrentRevision',
      }),
    },
    characterRevisions: {
      revisionAssets: r.many.characterRevisionAssets({
        from: r.characterRevisions.id,
        to: r.characterRevisionAssets.revisionId,
      }),
      lorebookReferences: r.many.characterRevisionLorebooks({
        from: r.characterRevisions.id,
        to: r.characterRevisionLorebooks.characterRevisionId,
      }),
    },
    assets: {
      characterRevisions: r.many.characterRevisionAssets({
        from: r.assets.id,
        to: r.characterRevisionAssets.assetId,
      }),
    },
    characterRevisionAssets: {
      asset: r.one.assets({
        from: r.characterRevisionAssets.assetId,
        to: r.assets.id,
      }),
    },
    characterRevisionLorebooks: {
      lorebookRevision: r.one.lorebookRevisions({
        from: r.characterRevisionLorebooks.lorebookRevisionId,
        to: r.lorebookRevisions.id,
      }),
    },
  }),
)
