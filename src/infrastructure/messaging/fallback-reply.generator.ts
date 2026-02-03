import type { GenerateReplyInput, ReplyGeneratorPort } from '@domain/messaging/ports/reply-generator.port';

export class FallbackReplyGenerator implements ReplyGeneratorPort {
  constructor(
    private readonly primary: ReplyGeneratorPort,
    private readonly fallback: ReplyGeneratorPort,
  ) {}

  async generate(input: GenerateReplyInput): Promise<string> {
    try {
      const primaryText = await this.primary.generate(input);
      const normalizedPrimary = typeof primaryText === 'string' ? primaryText.trim() : '';
      if (normalizedPrimary.length > 0) {
        return normalizedPrimary;
      }
    } catch (_error) {
      void _error;
    }

    const fallbackText = await this.fallback.generate(input);
    const normalizedFallback = typeof fallbackText === 'string' ? fallbackText.trim() : '';

    return normalizedFallback.length > 0 ? normalizedFallback : 'Ok.';
  }
}
