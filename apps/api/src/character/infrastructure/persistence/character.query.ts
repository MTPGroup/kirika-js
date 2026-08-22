import type { Database } from '~/shared/infrastructure/drizzle/drizzle.service'

export function findCharacterByIdQuery(db: Database, id: string) {
  return db.query.characters.findFirst({
    where: { id },
    with: {
      revisions: {
        with: {
          revisionAssets: true,
          lorebookReferences: true,
        },
      },
    },
  })
}

export type DrizzleCharacterWithRelations = NonNullable<
  Awaited<ReturnType<typeof findCharacterByIdQuery>>
>
