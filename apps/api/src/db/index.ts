import {
  accounts,
  authRelations,
  sessions,
  users,
  verifications,
} from './auth-schema.js'
import {
  assetKindEnum,
  assets,
  characterRelations,
  characterRevisionAssets,
  characterRevisionLorebooks,
  characterRevisions,
  characters,
} from './character-schema.js'
import {
  conversationMessages,
  conversationParticipants,
  conversations,
} from './conversation-schema.js'
import {
  lorebookEntries,
  lorebookRelations,
  lorebookRevisions,
  lorebooks,
} from './lorebook-schema.js'

export {
  accounts,
  assetKindEnum,
  assets,
  authRelations,
  characterRelations,
  characterRevisionAssets,
  characterRevisionLorebooks,
  characterRevisions,
  characters,
  conversationMessages,
  conversationParticipants,
  conversations,
  lorebookEntries,
  lorebookRelations,
  lorebookRevisions,
  lorebooks,
  sessions,
  users,
  verifications,
}

export const schema = {
  users,
  sessions,
  accounts,
  verifications,
  assetKindEnum,
  characters,
  characterRevisions,
  assets,
  characterRevisionAssets,
  characterRevisionLorebooks,
  conversations,
  conversationParticipants,
  conversationMessages,
  lorebooks,
  lorebookRevisions,
  lorebookEntries,
}

export const relations = {
  ...authRelations,
  ...characterRelations,
  ...lorebookRelations,
}
