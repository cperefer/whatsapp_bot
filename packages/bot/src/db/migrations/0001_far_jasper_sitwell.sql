CREATE TABLE `processed_messages` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`session_name` text NOT NULL,
	`message_id` text NOT NULL,
	`processed_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `processed_messages_session_message_unique` ON `processed_messages` (`session_name`,`message_id`);