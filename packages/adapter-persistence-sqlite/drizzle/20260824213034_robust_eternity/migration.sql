PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_character_revision_assets` (
	`revision_id` text NOT NULL,
	`asset_id` text NOT NULL,
	`kind` text NOT NULL,
	`name` text NOT NULL,
	`uri` text NOT NULL,
	`ordinal` integer NOT NULL,
	`extensions` text DEFAULT '{}' NOT NULL,
	CONSTRAINT `character_revision_assets_pkey` PRIMARY KEY(`revision_id`, `kind`, `ordinal`),
	CONSTRAINT `fk_character_revision_assets_revision_id_character_revisions_id_fk` FOREIGN KEY (`revision_id`) REFERENCES `character_revisions`(`id`) ON DELETE CASCADE,
	CONSTRAINT `fk_character_revision_assets_asset_id_assets_id_fk` FOREIGN KEY (`asset_id`) REFERENCES `assets`(`id`),
	CONSTRAINT "character_revision_assets_name_check" CHECK(length(trim("name")) > 0),
	CONSTRAINT "character_revision_assets_uri_check" CHECK(length(trim("uri")) > 0),
	CONSTRAINT "character_revision_assets_ordinal_check" CHECK("ordinal" >= 0),
	CONSTRAINT "character_revision_assets_kind_check" CHECK("kind" in (
        'avatar',
        'background',
        'emotion',
        'audio',
        'video',
        'model',
        'other'
      ))
);
--> statement-breakpoint
INSERT INTO `__new_character_revision_assets`(`revision_id`, `asset_id`, `kind`, `name`, `uri`, `ordinal`, `extensions`) SELECT `revision_id`, `asset_id`, `kind`, `name`, `uri`, `ordinal`, `extensions` FROM `character_revision_assets`;--> statement-breakpoint
DROP TABLE `character_revision_assets`;--> statement-breakpoint
ALTER TABLE `__new_character_revision_assets` RENAME TO `character_revision_assets`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_character_revision_lorebooks` (
	`character_revision_id` text NOT NULL,
	`lorebook_revision_id` text NOT NULL,
	`ordinal` integer NOT NULL,
	`enabled` integer DEFAULT true NOT NULL,
	CONSTRAINT `character_revision_lorebooks_pkey` PRIMARY KEY(`character_revision_id`, `lorebook_revision_id`),
	CONSTRAINT `fk_character_revision_lorebooks_character_revision_id_character_revisions_id_fk` FOREIGN KEY (`character_revision_id`) REFERENCES `character_revisions`(`id`) ON DELETE CASCADE,
	CONSTRAINT `fk_character_revision_lorebooks_lorebook_revision_id_lorebook_revisions_id_fk` FOREIGN KEY (`lorebook_revision_id`) REFERENCES `lorebook_revisions`(`id`),
	CONSTRAINT "character_revision_lorebook_ordinal_check" CHECK("ordinal" >= 0),
	CONSTRAINT "character_revision_lorebook_enabled_check" CHECK("enabled" in (0, 1))
);
--> statement-breakpoint
INSERT INTO `__new_character_revision_lorebooks`(`character_revision_id`, `lorebook_revision_id`, `ordinal`, `enabled`) SELECT `character_revision_id`, `lorebook_revision_id`, `ordinal`, `enabled` FROM `character_revision_lorebooks`;--> statement-breakpoint
DROP TABLE `character_revision_lorebooks`;--> statement-breakpoint
ALTER TABLE `__new_character_revision_lorebooks` RENAME TO `character_revision_lorebooks`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_character_revisions` (
	`id` text PRIMARY KEY,
	`character_id` text NOT NULL,
	`revision_number` integer NOT NULL,
	`is_draft` integer DEFAULT true NOT NULL,
	`name` text NOT NULL,
	`description` text DEFAULT '' NOT NULL,
	`personality` text DEFAULT '' NOT NULL,
	`scenario` text DEFAULT '' NOT NULL,
	`system_prompt` text DEFAULT '' NOT NULL,
	`post_history_instructions` text DEFAULT '' NOT NULL,
	`greetings` text DEFAULT '[]' NOT NULL,
	`examples` text DEFAULT '[]' NOT NULL,
	`extensions` text DEFAULT '{}' NOT NULL,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	CONSTRAINT `fk_character_revisions_character_id_characters_id_fk` FOREIGN KEY (`character_id`) REFERENCES `characters`(`id`) ON DELETE CASCADE,
	CONSTRAINT "character_revision_number_check" CHECK("revision_number" >= 1),
	CONSTRAINT "character_revision_draft_check" CHECK("is_draft" in (0, 1)),
	CONSTRAINT "character_revision_name_check" CHECK(length(trim("name")) > 0)
);
--> statement-breakpoint
INSERT INTO `__new_character_revisions`(`id`, `character_id`, `revision_number`, `is_draft`, `name`, `description`, `personality`, `scenario`, `system_prompt`, `post_history_instructions`, `greetings`, `examples`, `extensions`, `created_at`, `updated_at`) SELECT `id`, `character_id`, `revision_number`, `is_draft`, `name`, `description`, `personality`, `scenario`, `system_prompt`, `post_history_instructions`, `greetings`, `examples`, `extensions`, `created_at`, `updated_at` FROM `character_revisions`;--> statement-breakpoint
DROP TABLE `character_revisions`;--> statement-breakpoint
ALTER TABLE `__new_character_revisions` RENAME TO `character_revisions`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE INDEX `character_revision_assets_asset_idx` ON `character_revision_assets` (`asset_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `character_revision_lorebook_ordinal_uq` ON `character_revision_lorebooks` (`character_revision_id`,`ordinal`);--> statement-breakpoint
CREATE INDEX `character_revision_lorebook_revision_idx` ON `character_revision_lorebooks` (`lorebook_revision_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `character_revision_number_uq` ON `character_revisions` (`character_id`,`revision_number`);--> statement-breakpoint
CREATE UNIQUE INDEX `character_single_draft_uq` ON `character_revisions` (`character_id`) WHERE "character_revisions"."is_draft" = 1;