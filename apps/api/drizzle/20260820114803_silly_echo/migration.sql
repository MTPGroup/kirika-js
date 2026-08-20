CREATE TYPE "lorebook_entry_position" AS ENUM('before_history', 'after_history');--> statement-breakpoint
CREATE TYPE "lorebook_visibility" AS ENUM('private', 'unlisted', 'public');--> statement-breakpoint
CREATE TABLE "lorebook_entries" (
	"id" uuid PRIMARY KEY,
	"revision_id" uuid NOT NULL,
	"keys" jsonb DEFAULT '[]' NOT NULL,
	"title" text NOT NULL,
	"enabled" boolean DEFAULT true NOT NULL,
	"content" text NOT NULL,
	"position" "lorebook_entry_position" DEFAULT 'after_history'::"lorebook_entry_position" NOT NULL,
	"priority" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "lorebook_revisions" (
	"id" uuid PRIMARY KEY,
	"lorebook_id" uuid NOT NULL,
	"revision_number" integer NOT NULL,
	"is_draft" boolean DEFAULT true NOT NULL,
	"change_log" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "lorebooks" (
	"id" uuid PRIMARY KEY,
	"owner_id" uuid NOT NULL,
	"current_revision_id" uuid,
	"name" text NOT NULL,
	"description" text NOT NULL,
	"extensions" jsonb DEFAULT '{}' NOT NULL,
	"visibility" "lorebook_visibility" DEFAULT 'private'::"lorebook_visibility" NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "lorebook_entries_revision_priority_idx" ON "lorebook_entries" ("revision_id","priority");--> statement-breakpoint
CREATE UNIQUE INDEX "lorebook_revision_number_uq" ON "lorebook_revisions" ("lorebook_id","revision_number");--> statement-breakpoint
CREATE INDEX "lorebooks_owner_updated_at_idx" ON "lorebooks" ("owner_id","updated_at","id");--> statement-breakpoint
CREATE INDEX "lorebook_visibility_updated_at_idx" ON "lorebooks" ("visibility","updated_at","id");--> statement-breakpoint
ALTER TABLE "lorebook_entries" ADD CONSTRAINT "lorebook_entries_revision_id_lorebook_revisions_id_fkey" FOREIGN KEY ("revision_id") REFERENCES "lorebook_revisions"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "lorebook_revisions" ADD CONSTRAINT "lorebook_revisions_lorebook_id_lorebooks_id_fkey" FOREIGN KEY ("lorebook_id") REFERENCES "lorebooks"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "lorebooks" ADD CONSTRAINT "lorebooks_owner_id_users_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "users"("id");