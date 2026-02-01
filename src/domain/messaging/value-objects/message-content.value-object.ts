import { InvalidMessageContentError } from '../errors/invalid-message-content.error';

export class MessageContent {
  private constructor(private readonly raw: string) {}

  static create(input: string): MessageContent {
    const normalized = input.trim();

    if (normalized.length === 0) {
      throw new InvalidMessageContentError('Invalid message content');
    }

    if (normalized.length > 4096) {
      throw new InvalidMessageContentError('Invalid message content');
    }

    return new MessageContent(normalized);
  }

  get value(): string {
    return this.raw;
  }

  toString(): string {
    return this.raw;
  }
}
