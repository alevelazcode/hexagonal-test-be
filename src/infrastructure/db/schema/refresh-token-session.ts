import { index, text } from 'drizzle-orm/sqlite-core';

import { sqliteTable } from './sqlite-table';

export const refreshTokenSessionTable = sqliteTable(
  'refresh_token_session',
  {
    id: text('id').primaryKey(),
    userId: text('userId').notNull(),
    tokenHash: text('tokenHash').notNull(),
    createdAt: text('createdAt').notNull(),
    expiresAt: text('expiresAt').notNull(),
    revokedAt: text('revokedAt'),
    replacedById: text('replacedById'),
  },
  (table) => [index('refresh_token_session_user_id_idx').on(table.userId)],
);
