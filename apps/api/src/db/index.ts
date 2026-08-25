import {
  accounts,
  authRelations,
  sessions,
  users,
  verifications,
} from './auth-schema'
import {
  assetKindEnum,
  assets,
  characterRelations,
  characterRevisionAssets,
  characterRevisionLorebooks,
  characterRevisions,
  characters,
} from './character-schema'
import {
  conversationMessages,
  conversationParticipants,
  conversations,
} from './conversation-schema'
import { idempotencyKeys } from './idempotency-schema'
import {
  lorebookEntries,
  lorebookRelations,
  lorebookRevisions,
  lorebooks,
} from './lorebook-schema'

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
  idempotencyKeys,
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
  idempotencyKeys,
  lorebooks,
  lorebookRevisions,
  lorebookEntries,
}

export const relations = {
  ...authRelations,
  ...characterRelations,
  ...lorebookRelations,
}
