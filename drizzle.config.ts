import 'dotenv/config';

import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  dialect: 'sqlite',
  schema: './src/infrastructure/db/schema',
  out: './drizzle',
  dbCredentials: {
    url:
      (process.env.SQLITE_DB_PATH ? `file:${process.env.SQLITE_DB_PATH}` : undefined) ??
      process.env.DATABASE_URL ??
      'file:./data/app.db',
  },
  strict: true,
});
