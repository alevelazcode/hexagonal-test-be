import path from 'node:path';

import { migrate } from 'drizzle-orm/libsql/migrator';

import type { Database } from './database.module';

export async function runMigrations(db: Database): Promise<void> {
  await migrate(db, {
    migrationsFolder: path.resolve(process.cwd(), 'drizzle'),
  });
}
