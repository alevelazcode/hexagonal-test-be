import { InvalidPasswordError } from '../errors/invalid-password.error';

export class PlainPassword {
  private constructor(private readonly raw: string) {}

  static create(input: string): PlainPassword {
    const value = input;

    if (value.length < 8) {
      throw new InvalidPasswordError('Invalid password');
    }

    if (value.length > 200) {
      throw new InvalidPasswordError('Invalid password');
    }

    return new PlainPassword(value);
  }

  get value(): string {
    return this.raw;
  }
}
