ALTER TABLE "accounts" DROP CONSTRAINT "accounts_user_id_users_id_fkey";--> statement-breakpoint
ALTER TABLE "sessions" DROP CONSTRAINT "sessions_user_id_users_id_fkey";--> statement-breakpoint
ALTER TABLE "lorebook_entries" DROP CONSTRAINT "lorebook_entries_revision_id_lorebook_revisions_id_fkey";--> statement-breakpoint
ALTER TABLE "lorebook_revisions" DROP CONSTRAINT "lorebook_revisions_lorebook_id_lorebooks_id_fkey";--> statement-breakpoint
ALTER TABLE "lorebooks" DROP CONSTRAINT "lorebooks_owner_id_users_id_fkey";--> statement-breakpoint
DROP TABLE "accounts";--> statement-breakpoint
DROP TABLE "sessions";--> statement-breakpoint
DROP TABLE "users";--> statement-breakpoint
DROP TABLE "verifications";--> statement-breakpoint
DROP TABLE "lorebook_entries";--> statement-breakpoint
DROP TABLE "lorebook_revisions";--> statement-breakpoint
DROP TABLE "lorebooks";--> statement-breakpoint
DROP TYPE "lorebook_entry_position";