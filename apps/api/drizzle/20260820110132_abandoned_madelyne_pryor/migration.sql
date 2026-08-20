CREATE TYPE "lorebook_entry_position" AS ENUM('before_history', 'after_history');--> statement-breakpoint
CREATE TYPE "lorebook_visibility" AS ENUM('private', 'unlisted', 'public');--> statement-breakpoint
CREATE TABLE "accounts" (
	"id" text PRIMARY KEY,
	"account_id" text NOT NULL,
	"provider_id" text NOT NULL,
	"user_id" text NOT NULL,
	"access_token" text,
	"refresh_token" text,
	"id_token" text,
	"access_token_expires_at" timestamp,
	"refresh_token_expires_at" timestamp,
	"scope" text,
	"password" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"id" text PRIMARY KEY,
	"expires_at" timestamp NOT NULL,
	"token" text NOT NULL UNIQUE,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp NOT NULL,
	"ip_address" text,
	"user_agent" text,
	"user_id" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" text PRIMARY KEY,
	"name" text NOT NULL,
	"email" text NOT NULL UNIQUE,
	"email_verified" boolean DEFAULT false NOT NULL,
	"image" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "verifications" (
	"id" text PRIMARY KEY,
	"identifier" text NOT NULL,
	"value" text NOT NULL,
	"expires_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
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
	"owner_id" text NOT NULL,
	"current_revision_id" uuid,
	"name" text NOT NULL,
	"description" text NOT NULL,
	"extensions" jsonb DEFAULT '{}' NOT NULL,
	"visibility" "lorebook_visibility" DEFAULT 'private'::"lorebook_visibility" NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "accounts_userId_idx" ON "accounts" ("user_id");--> statement-breakpoint
CREATE INDEX "sessions_userId_idx" ON "sessions" ("user_id");--> statement-breakpoint
CREATE INDEX "verifications_identifier_idx" ON "verifications" ("identifier");--> statement-breakpoint
CREATE INDEX "lorebook_entries_revision_priority_idx" ON "lorebook_entries" ("revision_id","priority");--> statement-breakpoint
CREATE UNIQUE INDEX "lorebook_revision_number_uq" ON "lorebook_revisions" ("lorebook_id","revision_number");--> statement-breakpoint
CREATE INDEX "lorebooks_owner_updated_at_idx" ON "lorebooks" ("owner_id","updated_at","id");--> statement-breakpoint
CREATE INDEX "lorebook_visibility_updated_at_idx" ON "lorebooks" ("visibility","updated_at","id");--> statement-breakpoint
ALTER TABLE "accounts" ADD CONSTRAINT "accounts_user_id_users_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_users_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "lorebook_entries" ADD CONSTRAINT "lorebook_entries_revision_id_lorebook_revisions_id_fkey" FOREIGN KEY ("revision_id") REFERENCES "lorebook_revisions"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "lorebook_revisions" ADD CONSTRAINT "lorebook_revisions_lorebook_id_lorebooks_id_fkey" FOREIGN KEY ("lorebook_id") REFERENCES "lorebooks"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "lorebooks" ADD CONSTRAINT "lorebooks_owner_id_users_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "users"("id");