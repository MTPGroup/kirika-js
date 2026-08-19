import { defineRelationsPart } from 'drizzle-orm'
import {
	boolean,
	index,
	integer,
	jsonb,
	pgEnum,
	pgTable,
	text,
	timestamp,
	uniqueIndex,
	uuid,
} from 'drizzle-orm/pg-core'
import { users } from '~/auth/auth.drizzle-schema'

export const lorebooks = pgTable('lorebooks', {
	id: uuid('id').primaryKey(),
	ownerId: text('owner_id')
		.notNull()
		.references(() => users.id),
	currentRevisionId: uuid('current_revision_id'),
	name: text('name').notNull(),
	description: text('description').notNull(),
	extensions: jsonb('extensions')
		.$type<Record<string, unknown>>()
		.notNull()
		.default({}),
	createdAt: timestamp('created_at').defaultNow().notNull(),
	updatedAt: timestamp('updated_at')
		.defaultNow()
		.$onUpdate(() => new Date())
		.notNull(),
})

export const lorebookRevisions = pgTable(
	'lorebook_revisions',
	{
		id: uuid('id').primaryKey(),
		lorebookId: uuid('lorebook_id')
			.notNull()
			.references(() => lorebooks.id, { onDelete: 'cascade' }),
		revisionNumber: integer('revision_number').notNull(),
		isDraft: boolean('is_draft').notNull().default(true),
		changeLog: text('change_log'),
		createdAt: timestamp('created_at').defaultNow().notNull(),
	},
	(t) => [
		uniqueIndex('lorebook_revision_number_uq').on(
			t.lorebookId,
			t.revisionNumber,
		),
	],
)

export const lorebookEntryPositionEnum = pgEnum('lorebook_entry_position', [
	'before_history',
	'after_history',
])

export const lorebookEntries = pgTable(
	'lorebook_entries',
	{
		id: uuid('id').primaryKey(),
		revisionId: uuid('revision_id')
			.notNull()
			.references(() => lorebookRevisions.id, {
				onDelete: 'cascade',
			}),
		keys: jsonb('keys').$type<string[]>().notNull().default([]),
		title: text('title').notNull(),
		enabled: boolean('enabled').notNull().default(true),
		content: text('content').notNull(),
		position: lorebookEntryPositionEnum('position')
			.notNull()
			.default('after_history'),
		priority: integer('priority').notNull().default(0),
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
				alias: 'currentRevision',
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
