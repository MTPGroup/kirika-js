import type { Database } from '~/shared/infrastructure/drizzle/drizzle.service'

export function findLorebookByIdQuery(db: Database, id: string) {
  return db.query.lorebooks.findFirst({
    where: {
      id,
    },
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
