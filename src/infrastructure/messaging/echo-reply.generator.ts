import type { GenerateReplyInput, ReplyGeneratorPort } from '@domain/messaging/ports/reply-generator.port';

export class EchoReplyGenerator implements ReplyGeneratorPort {
  generate(input: GenerateReplyInput): Promise<string> {
    const normalized = input.incomingText.trim();
    return Promise.resolve(normalized.length > 0 ? `Echo: ${normalized}` : 'Echo');
  }
}
