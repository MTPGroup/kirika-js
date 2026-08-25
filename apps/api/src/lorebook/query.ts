import type { Db } from '../lib/db.js'

export function findLorebookByIdQuery(db: Db, id: string) {
  return db.query.lorebooks.findFirst({
    where: { id },
    with: {
      revisions: {
        with: {
          entries: true,
        },
      },
    },
  })
}

export type DrizzleLorebookWithRelations = NonNullable<
  Awaited<ReturnType<typeof findLorebookByIdQuery>>
>
