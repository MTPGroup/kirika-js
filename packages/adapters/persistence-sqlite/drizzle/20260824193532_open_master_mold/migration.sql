ALTER TABLE `lorebook_entries` ADD `secondary_keys` text DEFAULT '[]' NOT NULL;--> statement-breakpoint
ALTER TABLE `lorebook_entries` ADD `match_mode` text DEFAULT 'any' NOT NULL;--> statement-breakpoint
ALTER TABLE `lorebook_entries` ADD `constant` integer DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `lorebook_entries` ADD `case_sensitive` integer DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `lorebook_entries` ADD `match_whole_words` integer DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `lorebook_entries` ADD `probability` integer DEFAULT 100 NOT NULL;--> statement-breakpoint
ALTER TABLE `lorebook_entries` ADD `insertion_depth` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `lorebook_revisions` ADD `scan_depth` integer DEFAULT 20 NOT NULL;--> statement-breakpoint
ALTER TABLE `lorebook_revisions` ADD `token_budget` integer DEFAULT 2048 NOT NULL;--> statement-breakpoint
PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_lorebook_entries` (
	`id` text PRIMARY KEY,
	`revision_id` text NOT NULL,
	`keys` text DEFAULT '[]' NOT NULL,
	`secondary_keys` text DEFAULT '[]' NOT NULL,
	`match_mode` text DEFAULT 'any' NOT NULL,
	`constant` integer DEFAULT false NOT NULL,
	`case_sensitive` integer DEFAULT false NOT NULL,
	`match_whole_words` integer DEFAULT false NOT NULL,
	`probability` integer DEFAULT 100 NOT NULL,
	`insertion_depth` integer DEFAULT 0 NOT NULL,
	`title` text NOT NULL,
	`enabled` integer DEFAULT true NOT NULL,
	`content` text NOT NULL,
	`position` text DEFAULT 'after_history' NOT NULL,
	`priority` integer DEFAULT 0 NOT NULL,
	CONSTRAINT `fk_lorebook_entries_revision_id_lorebook_revisions_id_fk` FOREIGN KEY (`revision_id`) REFERENCES `lorebook_revisions`(`id`) ON DELETE CASCADE,
	CONSTRAINT "lorebook_entries_position_check" CHECK("position" in ('before_history', 'after_history', 'at_depth'))
);
--> statement-breakpoint
INSERT INTO `__new_lorebook_entries`(`id`, `revision_id`, `keys`, `title`, `enabled`, `content`, `position`, `priority`) SELECT `id`, `revision_id`, `keys`, `title`, `enabled`, `content`, `position`, `priority` FROM `lorebook_entries`;--> statement-breakpoint
DROP TABLE `lorebook_entries`;--> statement-breakpoint
ALTER TABLE `__new_lorebook_entries` RENAME TO `lorebook_entries`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE INDEX `lorebook_entries_revision_priority_idx` ON `lorebook_entries` (`revision_id`,`priority`);