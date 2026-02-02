import { InvalidEmailError } from '@domain/auth/errors';
import { Email } from '@domain/auth/value-objects';
import { describe, expect, it } from 'vitest';

describe('Email', () => {
  it('normalizes and returns the email value', () => {
    const email = Email.create('  TeSt@Example.com  ');

    expect(email.value).toBe('test@example.com');
    expect(email.toString()).toBe('test@example.com');
  });

  it('throws InvalidEmailError for invalid emails', () => {
    expect(() => Email.create('not-an-email')).toThrow(InvalidEmailError);
  });
});
