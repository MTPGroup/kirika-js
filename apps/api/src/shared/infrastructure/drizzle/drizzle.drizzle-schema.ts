import {
	accounts,
	sessions,
	users,
	verifications,
} from '~/auth/auth.drizzle-schema'
import {
	lorebookEntries,
	lorebookEntryPositionEnum,
	lorebookRevisions,
	lorebooks,
} from '~/lorebook/infrastructure/persistence/lorebook.drizzle-schema'

export { authRelations } from '~/auth/auth.drizzle-schema'
export { lorebookRelations } from '~/lorebook/infrastructure/persistence/lorebook.drizzle-schema'

export const schema = {
	users,
	accounts,
	sessions,
	verifications,
	lorebooks,
	lorebookRevisions,
	lorebookEntryPositionEnum,
	lorebookEntries,
}
