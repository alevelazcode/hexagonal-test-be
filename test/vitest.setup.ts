import 'reflect-metadata';

import crypto from 'node:crypto';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { faker } from '@faker-js/faker';

process.env.NODE_ENV ??= 'test';

const databaseUrl = process.env.DATABASE_URL;
if (typeof databaseUrl === 'string' && databaseUrl.startsWith('file:')) {
  process.env.SQLITE_DB_PATH ??= databaseUrl.slice('file:'.length);
} else {
  delete process.env.DATABASE_URL;
  process.env.SQLITE_DB_PATH ??= path.join(tmpdir(), `hex-test-be-${crypto.randomUUID()}.db`);
}

process.env.JWT_ACCESS_SECRET ??= 'a'.repeat(32);
process.env.JWT_REFRESH_SECRET ??= 'b'.repeat(32);

faker.seed(42);
