import { z } from 'zod';

import { InvalidEmailError } from '../errors/invalid-email.error';

const emailSchema = z.string().trim().toLowerCase().pipe(z.email().min(3).max(254));

export class Email {
  private constructor(private readonly raw: string) {}

  static create(input: string): Email {
    try {
      const normalized = emailSchema.parse(input);
      return new Email(normalized);
    } catch {
      throw new InvalidEmailError('Invalid email');
    }
  }

  get value(): string {
    return this.raw;
  }

  toString(): string {
    return this.raw;
  }
}
