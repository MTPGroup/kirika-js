CREATE TABLE "asset_owners" (
	"asset_id" uuid NOT NULL,
	"owner_id" uuid NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "asset_owners_pkey" PRIMARY KEY("asset_id","owner_id")
);
--> statement-breakpoint
ALTER TABLE "characters" ADD COLUMN "visibility" text DEFAULT 'private' NOT NULL;--> statement-breakpoint
CREATE INDEX "asset_owners_owner_created_at_idx" ON "asset_owners" ("owner_id","created_at");--> statement-breakpoint
CREATE INDEX "characters_visibility_updated_at_idx" ON "characters" ("visibility","updated_at","id");--> statement-breakpoint
ALTER TABLE "asset_owners" ADD CONSTRAINT "asset_owners_asset_id_assets_id_fkey" FOREIGN KEY ("asset_id") REFERENCES "assets"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "asset_owners" ADD CONSTRAINT "asset_owners_owner_id_users_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "users"("id") ON DELETE CASCADE;