import { InvalidEmailError } from '../errors/invalid-email.error';

export class Email {
  private constructor(private readonly raw: string) {}

  static create(input: string): Email {
    const normalized = input.trim().toLowerCase();

    if (normalized.length < 3 || normalized.length > 254) {
      throw new InvalidEmailError('Invalid email');
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(normalized)) {
      throw new InvalidEmailError('Invalid email');
    }

    return new Email(normalized);
  }

  get value(): string {
    return this.raw;
  }

  toString(): string {
    return this.raw;
  }
}
