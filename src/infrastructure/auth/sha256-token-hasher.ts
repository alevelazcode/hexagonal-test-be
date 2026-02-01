import crypto from 'node:crypto';

import type { TokenHasherPort } from '@domain/auth/ports/token-hasher.port';

export class Sha256TokenHasher implements TokenHasherPort {
  hash(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex');
  }
}
