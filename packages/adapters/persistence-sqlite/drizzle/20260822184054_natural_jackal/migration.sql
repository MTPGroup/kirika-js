CREATE TABLE `assets` (
	`id` text PRIMARY KEY,
	`storage_key` text,
	`media_type` text,
	`byte_size` integer,
	`sha256` blob
);
--> statement-breakpoint
CREATE TABLE `character_revision_assets` (
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
CREATE TABLE `character_revision_lorebooks` (
	`character_revision_id` text NOT NULL,
	`lorebook_revision_id` text NOT NULL,
	`ordinal` integer NOT NULL,
	`enabled` integer DEFAULT true NOT NULL,
	CONSTRAINT `character_revision_lorebooks_pkey` PRIMARY KEY(`character_revision_id`, `lorebook_revision_id`),
	CONSTRAINT `fk_character_revision_lorebooks_character_revision_id_character_revisions_id_fk` FOREIGN KEY (`character_revision_id`) REFERENCES `character_revisions`(`id`) ON DELETE CASCADE,
	CONSTRAINT `fk_character_revision_lorebooks_lorebook_revision_id_lorebook_revisions_id_fk` FOREIGN KEY (`lorebook_revision_id`) REFERENCES `lorebook_revisions`(`id`)
);
--> statement-breakpoint
CREATE TABLE `character_revisions` (
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
	CONSTRAINT `fk_character_revisions_character_id_characters_id_fk` FOREIGN KEY (`character_id`) REFERENCES `characters`(`id`) ON DELETE CASCADE
);
--> statement-breakpoint
CREATE TABLE `characters` (
	`id` text PRIMARY KEY,
	`owner_id` text NOT NULL,
	`current_revision_id` text,
	`alias` text,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	CONSTRAINT `fk_characters_owner_id_users_id_fk` FOREIGN KEY (`owner_id`) REFERENCES `users`(`id`) ON DELETE CASCADE
);
--> statement-breakpoint
CREATE TABLE `conversation_messages` (
	`id` text PRIMARY KEY,
	`conversation_id` text NOT NULL,
	`parent_message_id` text,
	`author_participant_id` text NOT NULL,
	`source` text NOT NULL,
	`status` text NOT NULL,
	`content` text DEFAULT '[]' NOT NULL,
	`model` text,
	`finish_reason` text,
	`token_usage` text,
	`error_reason` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	CONSTRAINT `fk_conversation_messages_conversation_id_conversations_id_fk` FOREIGN KEY (`conversation_id`) REFERENCES `conversations`(`id`) ON DELETE CASCADE,
	CONSTRAINT `fk_conversation_messages_parent_message_id_conversation_messages_id_fk` FOREIGN KEY (`parent_message_id`) REFERENCES `conversation_messages`(`id`),
	CONSTRAINT `fk_conversation_messages_author_participant_id_conversation_participants_id_fk` FOREIGN KEY (`author_participant_id`) REFERENCES `conversation_participants`(`id`)
);
--> statement-breakpoint
CREATE TABLE `conversation_participants` (
	`id` text PRIMARY KEY,
	`conversation_id` text NOT NULL,
	`type` text NOT NULL,
	`role` text NOT NULL,
	`status` text DEFAULT 'active' NOT NULL,
	`user_id` text,
	`character_id` text,
	`character_revision_id` text,
	`display_name` text NOT NULL,
	`joined_at` integer NOT NULL,
	`left_at` integer,
	CONSTRAINT `fk_conversation_participants_conversation_id_conversations_id_fk` FOREIGN KEY (`conversation_id`) REFERENCES `conversations`(`id`) ON DELETE CASCADE,
	CONSTRAINT `fk_conversation_participants_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`),
	CONSTRAINT `fk_conversation_participants_character_id_characters_id_fk` FOREIGN KEY (`character_id`) REFERENCES `characters`(`id`),
	CONSTRAINT `fk_conversation_participants_character_revision_id_character_revisions_id_fk` FOREIGN KEY (`character_revision_id`) REFERENCES `character_revisions`(`id`),
	CONSTRAINT "conversation_participants_reference_check" CHECK(
        (
          "type" = 'human'
          and "user_id" is not null
          and "character_id" is null
          and "character_revision_id" is null
        )
        or
        (
          "type" = 'character'
          and "user_id" is null
          and "character_id" is not null
          and "character_revision_id" is not null
        )
      )
);
--> statement-breakpoint
CREATE TABLE `conversations` (
	`id` text PRIMARY KEY,
	`owner_id` text NOT NULL,
	`mode` text NOT NULL,
	`title` text,
	`status` text DEFAULT 'active' NOT NULL,
	`turn_policy` text DEFAULT 'manual' NOT NULL,
	`active_leaf_message_id` text,
	`active_generation_message_id` text,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`archived_at` integer,
	CONSTRAINT `fk_conversations_owner_id_users_id_fk` FOREIGN KEY (`owner_id`) REFERENCES `users`(`id`) ON DELETE CASCADE,
	CONSTRAINT "conversations_mode_check" CHECK("mode" in ('direct', 'group')),
	CONSTRAINT "conversations_status_check" CHECK("status" in ('active', 'archived')),
	CONSTRAINT "conversations_turn_policy_check" CHECK("turn_policy" in ('manual', 'round_robin', 'auto'))
);
--> statement-breakpoint
CREATE TABLE `lorebook_entries` (
	`id` text PRIMARY KEY,
	`revision_id` text NOT NULL,
	`keys` text DEFAULT '[]' NOT NULL,
	`title` text NOT NULL,
	`enabled` integer DEFAULT true NOT NULL,
	`content` text NOT NULL,
	`position` text DEFAULT 'after_history' NOT NULL,
	`priority` integer DEFAULT 0 NOT NULL,
	CONSTRAINT `fk_lorebook_entries_revision_id_lorebook_revisions_id_fk` FOREIGN KEY (`revision_id`) REFERENCES `lorebook_revisions`(`id`) ON DELETE CASCADE,
	CONSTRAINT "lorebook_entries_position_check" CHECK("position" in ('before_history', 'after_history'))
);
--> statement-breakpoint
CREATE TABLE `lorebook_revisions` (
	`id` text PRIMARY KEY,
	`lorebook_id` text NOT NULL,
	`revision_number` integer NOT NULL,
	`is_draft` integer DEFAULT true NOT NULL,
	`change_log` text,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	CONSTRAINT `fk_lorebook_revisions_lorebook_id_lorebooks_id_fk` FOREIGN KEY (`lorebook_id`) REFERENCES `lorebooks`(`id`) ON DELETE CASCADE
);
--> statement-breakpoint
CREATE TABLE `lorebooks` (
	`id` text PRIMARY KEY,
	`owner_id` text NOT NULL,
	`current_revision_id` text,
	`name` text NOT NULL,
	`description` text DEFAULT '' NOT NULL,
	`extensions` text DEFAULT '{}' NOT NULL,
	`visibility` text DEFAULT 'private' NOT NULL,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	CONSTRAINT `fk_lorebooks_owner_id_users_id_fk` FOREIGN KEY (`owner_id`) REFERENCES `users`(`id`),
	CONSTRAINT "lorebooks_visibility_check" CHECK("visibility" in ('private', 'unlisted', 'public'))
);
--> statement-breakpoint
CREATE TABLE `users` (
	`id` text PRIMARY KEY,
	`name` text NOT NULL,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch() * 1000) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `assets_sha256_uq` ON `assets` (`sha256`);--> statement-breakpoint
CREATE INDEX `character_revision_assets_asset_idx` ON `character_revision_assets` (`asset_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `character_revision_lorebook_ordinal_uq` ON `character_revision_lorebooks` (`character_revision_id`,`ordinal`);--> statement-breakpoint
CREATE INDEX `character_revision_lorebook_revision_idx` ON `character_revision_lorebooks` (`lorebook_revision_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `character_revision_number_uq` ON `character_revisions` (`character_id`,`revision_number`);--> statement-breakpoint
CREATE UNIQUE INDEX `character_single_draft_uq` ON `character_revisions` (`character_id`) WHERE "character_revisions"."is_draft" = 1;--> statement-breakpoint
CREATE INDEX `characters_owner_updated_at_idx` ON `characters` (`owner_id`,`updated_at`,`id`);--> statement-breakpoint
CREATE INDEX `conversation_messages_conversation_idx` ON `conversation_messages` (`conversation_id`,`created_at`,`id`);--> statement-breakpoint
CREATE INDEX `conversation_messages_parent_idx` ON `conversation_messages` (`parent_message_id`);--> statement-breakpoint
CREATE INDEX `conversation_participants_conversation_idx` ON `conversation_participants` (`conversation_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `conversation_participants_user_uq` ON `conversation_participants` (`conversation_id`,`user_id`) WHERE "conversation_participants"."user_id" is not null;--> statement-breakpoint
CREATE UNIQUE INDEX `conversation_participants_character_uq` ON `conversation_participants` (`conversation_id`,`character_revision_id`) WHERE "conversation_participants"."character_revision_id" is not null;--> statement-breakpoint
CREATE INDEX `conversations_owner_updated_at_idx` ON `conversations` (`owner_id`,`updated_at`,`id`);--> statement-breakpoint
CREATE INDEX `lorebook_entries_revision_priority_idx` ON `lorebook_entries` (`revision_id`,`priority`);--> statement-breakpoint
CREATE UNIQUE INDEX `lorebook_revision_number_uq` ON `lorebook_revisions` (`lorebook_id`,`revision_number`);--> statement-breakpoint
CREATE INDEX `lorebooks_owner_updated_at_idx` ON `lorebooks` (`owner_id`,`updated_at`,`id`);--> statement-breakpoint
CREATE INDEX `lorebook_visibility_updated_at_idx` ON `lorebooks` (`visibility`,`updated_at`,`id`);