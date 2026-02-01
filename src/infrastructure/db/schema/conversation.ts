import { index, text, uniqueIndex } from 'drizzle-orm/sqlite-core';

import { sqliteTable } from './sqlite-table';

export const conversationTable = sqliteTable(
  'conversation',
  {
    id: text('id').primaryKey(),
    telegramChatId: text('telegramChatId').notNull(),
    createdAt: text('createdAt').notNull(),
    lastMessageAt: text('lastMessageAt').notNull(),
  },
  (table) => [
    uniqueIndex('conversation_telegram_chat_id_unique').on(table.telegramChatId),
    index('conversation_last_message_at_idx').on(table.lastMessageAt),
  ],
);
