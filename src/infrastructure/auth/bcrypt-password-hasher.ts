import type { PasswordHasherPort } from '@domain/auth/ports/password-hasher.port';

type BcryptModule = typeof import('bcrypt');

let bcryptPromise: Promise<BcryptModule> | undefined;

function getBcrypt(): Promise<BcryptModule> {
  bcryptPromise ??= import('bcrypt');
  return bcryptPromise;
}

export class BcryptPasswordHasher implements PasswordHasherPort {
  constructor(private readonly saltRounds: number) {}

  hash(plain: string): Promise<string> {
    return getBcrypt().then((bcrypt) => bcrypt.hash(plain, this.saltRounds));
  }

  compare(plain: string, hash: string): Promise<boolean> {
    return getBcrypt().then((bcrypt) => bcrypt.compare(plain, hash));
  }
}
