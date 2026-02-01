import { InvalidMessageContentError } from '@domain/messaging/errors/invalid-message-content.error';
import { MessageContent } from '@domain/messaging/value-objects/message-content.value-object';
import { describe, expect, it } from 'vitest';

describe('MessageContent', () => {
  it('trims whitespace', () => {
    const value = MessageContent.create(' hello ');
    expect(value.value).toBe('hello');
  });

  it('rejects empty content', () => {
    expect(() => MessageContent.create('   ')).toThrow(InvalidMessageContentError);
  });
});
