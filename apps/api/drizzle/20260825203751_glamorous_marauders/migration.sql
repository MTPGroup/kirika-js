CREATE TYPE "asset_kind" AS ENUM('avatar', 'background', 'emotion', 'audio', 'video', 'model', 'other');--> statement-breakpoint
CREATE TABLE "accounts" (
	"id" uuid PRIMARY KEY DEFAULT pg_catalog.gen_random_uuid(),
	"account_id" text NOT NULL,
	"provider_id" text NOT NULL,
	"user_id" uuid NOT NULL,
	"access_token" text,
	"refresh_token" text,
	"id_token" text,
	"access_token_expires_at" timestamp,
	"refresh_token_expires_at" timestamp,
	"scope" text,
	"password" text,
	"issuer" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "assets" (
	"id" uuid PRIMARY KEY,
	"storage_key" text,
	"media_type" text,
	"byte_size" bigint,
	"sha256" bytea
);
--> statement-breakpoint
CREATE TABLE "character_revision_assets" (
	"revision_id" uuid,
	"asset_id" uuid NOT NULL,
	"kind" "asset_kind",
	"name" text NOT NULL,
	"uri" text NOT NULL,
	"ordinal" integer,
	"extensions" jsonb DEFAULT '{}' NOT NULL,
	CONSTRAINT "character_revision_assets_pkey" PRIMARY KEY("revision_id","kind","ordinal")
);
--> statement-breakpoint
CREATE TABLE "character_revision_lorebooks" (
	"character_revision_id" uuid,
	"lorebook_revision_id" uuid,
	"ordinal" integer NOT NULL,
	"enabled" boolean DEFAULT true NOT NULL,
	CONSTRAINT "character_revision_lorebooks_pkey" PRIMARY KEY("character_revision_id","lorebook_revision_id")
);
--> statement-breakpoint
CREATE TABLE "character_revisions" (
	"id" uuid PRIMARY KEY,
	"character_id" uuid NOT NULL,
	"revision_number" integer NOT NULL,
	"is_draft" boolean DEFAULT true NOT NULL,
	"name" text NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"personality" text DEFAULT '' NOT NULL,
	"scenario" text DEFAULT '' NOT NULL,
	"system_prompt" text DEFAULT '' NOT NULL,
	"post_history_instructions" text DEFAULT '' NOT NULL,
	"greetings" text[] NOT NULL,
	"examples" text[] NOT NULL,
	"extensions" jsonb DEFAULT '{}' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "characters" (
	"id" uuid PRIMARY KEY,
	"owner_id" uuid NOT NULL,
	"current_revision_id" uuid,
	"alias" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "conversation_messages" (
	"id" uuid PRIMARY KEY,
	"conversation_id" uuid NOT NULL,
	"parent_message_id" uuid,
	"author_participant_id" uuid NOT NULL,
	"source" text NOT NULL,
	"status" text NOT NULL,
	"content" jsonb DEFAULT '[]' NOT NULL,
	"model" text,
	"finish_reason" text,
	"token_usage" jsonb,
	"error_reason" text,
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "conversation_participants" (
	"id" uuid PRIMARY KEY,
	"conversation_id" uuid NOT NULL,
	"type" text NOT NULL,
	"role" text NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"user_id" uuid,
	"character_id" uuid,
	"character_revision_id" uuid,
	"display_name" text NOT NULL,
	"joined_at" timestamp NOT NULL,
	"left_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "conversations" (
	"id" uuid PRIMARY KEY,
	"owner_id" uuid NOT NULL,
	"mode" text NOT NULL,
	"title" text,
	"status" text DEFAULT 'active' NOT NULL,
	"turn_policy" text DEFAULT 'manual' NOT NULL,
	"active_leaf_message_id" uuid,
	"active_generation_message_id" uuid,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"archived_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "lorebook_entries" (
	"id" uuid PRIMARY KEY,
	"revision_id" uuid NOT NULL,
	"keys" jsonb DEFAULT '[]' NOT NULL,
	"secondary_keys" jsonb DEFAULT '[]' NOT NULL,
	"title" text NOT NULL,
	"enabled" boolean DEFAULT true NOT NULL,
	"content" text NOT NULL,
	"position" text DEFAULT 'after_history' NOT NULL,
	"priority" integer DEFAULT 0 NOT NULL,
	"match_mode" text DEFAULT 'any' NOT NULL,
	"constant" boolean DEFAULT false NOT NULL,
	"case_sensitive" boolean DEFAULT false NOT NULL,
	"match_whole_words" boolean DEFAULT false NOT NULL,
	"probability" integer DEFAULT 100 NOT NULL,
	"insertion_depth" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "lorebook_revisions" (
	"id" uuid PRIMARY KEY,
	"lorebook_id" uuid NOT NULL,
	"revision_number" integer NOT NULL,
	"is_draft" boolean DEFAULT true NOT NULL,
	"scan_depth" integer DEFAULT 20 NOT NULL,
	"token_budget" integer DEFAULT 2048 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "lorebooks" (
	"id" uuid PRIMARY KEY,
	"owner_id" uuid NOT NULL,
	"current_revision_id" uuid,
	"name" text NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"visibility" text DEFAULT 'private' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"id" uuid PRIMARY KEY DEFAULT pg_catalog.gen_random_uuid(),
	"expires_at" timestamp NOT NULL,
	"token" text NOT NULL UNIQUE,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp NOT NULL,
	"ip_address" text,
	"user_agent" text,
	"user_id" uuid NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT pg_catalog.gen_random_uuid(),
	"name" text NOT NULL,
	"email" text NOT NULL UNIQUE,
	"email_verified" boolean DEFAULT false NOT NULL,
	"image" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "verifications" (
	"id" uuid PRIMARY KEY DEFAULT pg_catalog.gen_random_uuid(),
	"identifier" text NOT NULL,
	"value" text NOT NULL,
	"expires_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "accounts_userId_idx" ON "accounts" ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "assets_sha256_uq" ON "assets" ("sha256");--> statement-breakpoint
CREATE INDEX "character_revision_assets_asset_idx" ON "character_revision_assets" ("asset_id");--> statement-breakpoint
CREATE UNIQUE INDEX "character_revision_lorebook_ordinal_uq" ON "character_revision_lorebooks" ("character_revision_id","ordinal");--> statement-breakpoint
CREATE INDEX "character_revision_lorebook_revision_idx" ON "character_revision_lorebooks" ("lorebook_revision_id");--> statement-breakpoint
CREATE UNIQUE INDEX "character_revision_number_uq" ON "character_revisions" ("character_id","revision_number");--> statement-breakpoint
CREATE UNIQUE INDEX "character_single_draft_uq" ON "character_revisions" ("character_id") WHERE "is_draft" = true;--> statement-breakpoint
CREATE INDEX "characters_owner_updated_at_idx" ON "characters" ("owner_id","updated_at","id");--> statement-breakpoint
CREATE INDEX "conversation_messages_conversation_idx" ON "conversation_messages" ("conversation_id","created_at","id");--> statement-breakpoint
CREATE INDEX "conversation_messages_parent_idx" ON "conversation_messages" ("parent_message_id");--> statement-breakpoint
CREATE INDEX "conversation_participants_conversation_idx" ON "conversation_participants" ("conversation_id");--> statement-breakpoint
CREATE UNIQUE INDEX "conversation_participants_user_uq" ON "conversation_participants" ("conversation_id","user_id") WHERE "user_id" is not null;--> statement-breakpoint
CREATE UNIQUE INDEX "conversation_participants_character_uq" ON "conversation_participants" ("conversation_id","character_revision_id") WHERE "character_revision_id" is not null;--> statement-breakpoint
CREATE INDEX "conversations_owner_updated_at_idx" ON "conversations" ("owner_id","updated_at","id");--> statement-breakpoint
CREATE INDEX "lorebook_entries_revision_priority_idx" ON "lorebook_entries" ("revision_id","priority");--> statement-breakpoint
CREATE UNIQUE INDEX "lorebook_revision_number_uq" ON "lorebook_revisions" ("lorebook_id","revision_number");--> statement-breakpoint
CREATE INDEX "lorebooks_owner_updated_at_idx" ON "lorebooks" ("owner_id","updated_at","id");--> statement-breakpoint
CREATE INDEX "lorebooks_visibility_updated_at_idx" ON "lorebooks" ("visibility","updated_at","id");--> statement-breakpoint
CREATE INDEX "sessions_userId_idx" ON "sessions" ("user_id");--> statement-breakpoint
CREATE INDEX "verifications_identifier_idx" ON "verifications" ("identifier");--> statement-breakpoint
ALTER TABLE "accounts" ADD CONSTRAINT "accounts_user_id_users_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "character_revision_assets" ADD CONSTRAINT "character_revision_assets_L8hRBjWXyWGi_fkey" FOREIGN KEY ("revision_id") REFERENCES "character_revisions"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "character_revision_assets" ADD CONSTRAINT "character_revision_assets_asset_id_assets_id_fkey" FOREIGN KEY ("asset_id") REFERENCES "assets"("id");--> statement-breakpoint
ALTER TABLE "character_revision_lorebooks" ADD CONSTRAINT "character_revision_lorebooks_sSNWk5AL1RCv_fkey" FOREIGN KEY ("character_revision_id") REFERENCES "character_revisions"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "character_revision_lorebooks" ADD CONSTRAINT "character_revision_lorebooks_sZ5gZ1Bx0ikL_fkey" FOREIGN KEY ("lorebook_revision_id") REFERENCES "lorebook_revisions"("id");--> statement-breakpoint
ALTER TABLE "character_revisions" ADD CONSTRAINT "character_revisions_character_id_characters_id_fkey" FOREIGN KEY ("character_id") REFERENCES "characters"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "characters" ADD CONSTRAINT "characters_owner_id_users_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "users"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "conversation_messages" ADD CONSTRAINT "conversation_messages_conversation_id_conversations_id_fkey" FOREIGN KEY ("conversation_id") REFERENCES "conversations"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "conversation_messages" ADD CONSTRAINT "conversation_messages_xZEQXDjAnfxN_fkey" FOREIGN KEY ("author_participant_id") REFERENCES "conversation_participants"("id");--> statement-breakpoint
ALTER TABLE "conversation_participants" ADD CONSTRAINT "conversation_participants_conversation_id_conversations_id_fkey" FOREIGN KEY ("conversation_id") REFERENCES "conversations"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "conversation_participants" ADD CONSTRAINT "conversation_participants_user_id_users_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id");--> statement-breakpoint
ALTER TABLE "conversation_participants" ADD CONSTRAINT "conversation_participants_character_id_characters_id_fkey" FOREIGN KEY ("character_id") REFERENCES "characters"("id");--> statement-breakpoint
ALTER TABLE "conversation_participants" ADD CONSTRAINT "conversation_participants_yjrEFrMPgWJL_fkey" FOREIGN KEY ("character_revision_id") REFERENCES "character_revisions"("id");--> statement-breakpoint
ALTER TABLE "conversations" ADD CONSTRAINT "conversations_owner_id_users_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "users"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "lorebook_entries" ADD CONSTRAINT "lorebook_entries_revision_id_lorebook_revisions_id_fkey" FOREIGN KEY ("revision_id") REFERENCES "lorebook_revisions"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "lorebook_revisions" ADD CONSTRAINT "lorebook_revisions_lorebook_id_lorebooks_id_fkey" FOREIGN KEY ("lorebook_id") REFERENCES "lorebooks"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "lorebooks" ADD CONSTRAINT "lorebooks_owner_id_users_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "users"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_users_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE;