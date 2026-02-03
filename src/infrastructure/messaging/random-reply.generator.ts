import type { GenerateReplyInput, ReplyGeneratorPort } from '@domain/messaging/ports/reply-generator.port';

const DEFAULT_REPLIES = [
  'Ok.',
  'Entendido.',
  'Perfecto.',
  'Gracias por tu mensaje.',
  'Dale, lo reviso.',
  'Listo.',
];

export class RandomReplyGenerator implements ReplyGeneratorPort {
  constructor(
    private readonly random: () => number = Math.random,
    private readonly replies: readonly string[] = DEFAULT_REPLIES,
  ) {}

  generate(input: GenerateReplyInput): Promise<string> {
    void input;
    const safeReplies = this.replies.length > 0 ? this.replies : DEFAULT_REPLIES;

    const index = Math.floor(this.random() * safeReplies.length);
    const chosen = safeReplies[index];

    return Promise.resolve(typeof chosen === 'string' && chosen.trim().length > 0 ? chosen : 'Ok.');
  }
}
