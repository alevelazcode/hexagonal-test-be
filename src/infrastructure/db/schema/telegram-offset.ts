import { integer, text } from 'drizzle-orm/sqlite-core';

import { sqliteTable } from './sqlite-table';

export const telegramOffsetTable = sqliteTable('telegram_offset', {
  id: text('id').primaryKey(),
  offset: integer('offset').notNull(),
  updatedAt: text('updatedAt').notNull(),
});
