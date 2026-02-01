CREATE TABLE `conversation` (
	`id` text PRIMARY KEY NOT NULL,
	`telegramChatId` text NOT NULL,
	`createdAt` text NOT NULL,
	`lastMessageAt` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `message` (
	`id` text PRIMARY KEY NOT NULL,
	`conversationId` text NOT NULL,
	`telegramChatId` text NOT NULL,
	`direction` text NOT NULL,
	`content` text NOT NULL,
	`createdAt` text NOT NULL,
	`telegramUpdateId` integer,
	`telegramMessageId` integer
);
--> statement-breakpoint
CREATE TABLE `telegram_offset` (
	`id` text PRIMARY KEY NOT NULL,
	`offset` integer NOT NULL,
	`updatedAt` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `conversation_telegram_chat_id_unique` ON `conversation` (`telegramChatId`);
--> statement-breakpoint
CREATE INDEX `conversation_last_message_at_idx` ON `conversation` (`lastMessageAt`);
--> statement-breakpoint
CREATE INDEX `message_conversation_id_idx` ON `message` (`conversationId`);
--> statement-breakpoint
CREATE INDEX `message_telegram_chat_id_idx` ON `message` (`telegramChatId`);
--> statement-breakpoint
CREATE INDEX `message_created_at_idx` ON `message` (`createdAt`);
--> statement-breakpoint
CREATE UNIQUE INDEX `message_telegram_update_id_unique` ON `message` (`telegramUpdateId`);
