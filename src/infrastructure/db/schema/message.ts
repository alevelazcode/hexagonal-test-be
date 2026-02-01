import { index, integer, text, uniqueIndex } from 'drizzle-orm/sqlite-core';

import { sqliteTable } from './sqlite-table';

export const messageTable = sqliteTable(
  'message',
  {
    id: text('id').primaryKey(),
    conversationId: text('conversationId').notNull(),
    telegramChatId: text('telegramChatId').notNull(),
    direction: text('direction').notNull(),
    content: text('content').notNull(),
    createdAt: text('createdAt').notNull(),
    telegramUpdateId: integer('telegramUpdateId'),
    telegramMessageId: integer('telegramMessageId'),
  },
  (table) => [
    index('message_conversation_id_idx').on(table.conversationId),
    index('message_telegram_chat_id_idx').on(table.telegramChatId),
    index('message_created_at_idx').on(table.createdAt),
    uniqueIndex('message_telegram_update_id_unique').on(table.telegramUpdateId),
  ],
);
