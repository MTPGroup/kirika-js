CREATE TABLE "idempotency_keys" (
	"key" text PRIMARY KEY,
	"user_id" uuid NOT NULL,
	"resource_id" text NOT NULL,
	"status_code" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"expires_at" timestamp NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX "idempotency_keys_user_resource_uq" ON "idempotency_keys" ("user_id","resource_id");--> statement-breakpoint
CREATE INDEX "idempotency_keys_expires_at_idx" ON "idempotency_keys" ("expires_at");