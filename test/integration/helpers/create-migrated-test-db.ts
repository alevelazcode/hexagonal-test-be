import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { runMigrations } from '@infrastructure/db/migrations';
import * as schema from '@infrastructure/db/schema';
import { createClient } from '@libsql/client';
import { drizzle, type LibSQLDatabase } from 'drizzle-orm/libsql';

export async function createMigratedTestDb(): Promise<{
  db: LibSQLDatabase<typeof schema>;
  cleanup: () => Promise<void>;
}> {
  const dir = await mkdtemp(path.join(tmpdir(), 'hex-test-be-'));
  const dbPath = path.join(dir, 'test.db');
  const url = `file:${dbPath}`;

  const client = createClient({ url });
  const db = drizzle(client, { schema });

  await runMigrations(db);

  return {
    db,
    cleanup: async () => {
      try {
        client.close();
      } catch {
        // ignore
      }
      await rm(dir, { recursive: true, force: true });
    },
  };
}
