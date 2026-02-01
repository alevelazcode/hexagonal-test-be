import crypto from 'node:crypto';

import type { IdGeneratorPort } from '@domain/auth/ports/id-generator.port';

export class RandomUuidGenerator implements IdGeneratorPort {
  generate(): string {
    return crypto.randomUUID();
  }
}
