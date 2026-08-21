CREATE TYPE "asset_kind" AS ENUM('avatar', 'background', 'emotion', 'audio', 'video', 'model', 'other');--> statement-breakpoint
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
CREATE UNIQUE INDEX "assets_sha256_uq" ON "assets" ("sha256");--> statement-breakpoint
CREATE INDEX "character_revision_assets_asset_idx" ON "character_revision_assets" ("asset_id");--> statement-breakpoint
CREATE UNIQUE INDEX "character_revision_lorebook_ordinal_uq" ON "character_revision_lorebooks" ("character_revision_id","ordinal");--> statement-breakpoint
CREATE INDEX "character_revision_lorebook_revision_idx" ON "character_revision_lorebooks" ("lorebook_revision_id");--> statement-breakpoint
CREATE UNIQUE INDEX "character_revision_number_uq" ON "character_revisions" ("character_id","revision_number");--> statement-breakpoint
CREATE UNIQUE INDEX "character_single_draft_uq" ON "character_revisions" ("character_id") WHERE "is_draft" = true;--> statement-breakpoint
CREATE INDEX "characters_owner_updated_at_idx" ON "characters" ("owner_id","updated_at","id");--> statement-breakpoint
ALTER TABLE "character_revision_assets" ADD CONSTRAINT "character_revision_assets_L8hRBjWXyWGi_fkey" FOREIGN KEY ("revision_id") REFERENCES "character_revisions"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "character_revision_assets" ADD CONSTRAINT "character_revision_assets_asset_id_assets_id_fkey" FOREIGN KEY ("asset_id") REFERENCES "assets"("id");--> statement-breakpoint
ALTER TABLE "character_revision_lorebooks" ADD CONSTRAINT "character_revision_lorebooks_sSNWk5AL1RCv_fkey" FOREIGN KEY ("character_revision_id") REFERENCES "character_revisions"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "character_revision_lorebooks" ADD CONSTRAINT "character_revision_lorebooks_sZ5gZ1Bx0ikL_fkey" FOREIGN KEY ("lorebook_revision_id") REFERENCES "lorebook_revisions"("id");--> statement-breakpoint
ALTER TABLE "character_revisions" ADD CONSTRAINT "character_revisions_character_id_characters_id_fkey" FOREIGN KEY ("character_id") REFERENCES "characters"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "characters" ADD CONSTRAINT "characters_owner_id_users_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "users"("id") ON DELETE CASCADE;