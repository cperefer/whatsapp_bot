CREATE TABLE `activity_sessions` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` integer NOT NULL,
	`type` text NOT NULL,
	`date` text NOT NULL,
	`distance_km` real,
	`duration_seconds` integer,
	`pace` text,
	`notes` text,
	`rpe` text,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
