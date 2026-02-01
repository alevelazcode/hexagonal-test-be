import { text, uniqueIndex } from 'drizzle-orm/sqlite-core';

import { sqliteTable } from './sqlite-table';

export const userTable = sqliteTable(
  'user',
  {
    id: text('id').primaryKey(),
    email: text('email').notNull(),
    passwordHash: text('passwordHash').notNull(),
    createdAt: text('createdAt').notNull(),
  },
  (table) => [uniqueIndex('user_email_unique').on(table.email)],
);
