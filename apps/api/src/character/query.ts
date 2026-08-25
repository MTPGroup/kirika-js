import type { Db } from '../lib/db'

export function findCharacterByIdQuery(db: Db, id: string) {
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
