import { InvalidPasswordHashError } from '../errors/invalid-password-hash.error';

export class PasswordHash {
  private constructor(private readonly raw: string) {}

  static create(input: string): PasswordHash {
    const value = input.trim();

    if (value.length < 10) {
      throw new InvalidPasswordHashError('Invalid password hash');
    }

    return new PasswordHash(value);
  }

  get value(): string {
    return this.raw;
  }

  toString(): string {
    return this.raw;
  }
}
