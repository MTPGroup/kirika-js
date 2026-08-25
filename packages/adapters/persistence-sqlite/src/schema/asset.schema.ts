import {
  blob,
  integer,
  sqliteTable,
  text,
  uniqueIndex,
} from 'drizzle-orm/sqlite-core'

export const assets = sqliteTable(
  'assets',
  {
    id: text('id').primaryKey(),
    storageKey: text('storage_key'),
    mediaType: text('media_type'),
    byteSize: integer('byte_size', {
      mode: 'number',
    }),
    sha256: blob('sha256', {
      mode: 'buffer',
    }),
  },
  (t) => [uniqueIndex('assets_sha256_uq').on(t.sha256)],
)
