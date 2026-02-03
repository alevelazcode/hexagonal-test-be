import type { ReplyGeneratorPort } from '@domain/messaging/ports/reply-generator.port';
import { FallbackReplyGenerator } from '@infrastructure/messaging/fallback-reply.generator';
import { describe, expect, it, vi } from 'vitest';

describe('FallbackReplyGenerator', () => {
  it('returns primary reply when it is non-empty', async () => {
    const primary: ReplyGeneratorPort = {
      generate: vi.fn(() => Promise.resolve(' hello ')),
    };
    const fallback: ReplyGeneratorPort = {
      generate: vi.fn(() => Promise.resolve('fallback')),
    };

    const generator = new FallbackReplyGenerator(primary, fallback);

    const reply = await generator.generate({ chatId: '123', incomingText: 'hi' });

    expect(reply).toBe('hello');
    expect(primary.generate).toHaveBeenCalledTimes(1);
    expect(fallback.generate).not.toHaveBeenCalled();
  });

  it('uses fallback when primary returns empty', async () => {
    const primary: ReplyGeneratorPort = {
      generate: vi.fn(() => Promise.resolve('   ')),
    };
    const fallback: ReplyGeneratorPort = {
      generate: vi.fn(() => Promise.resolve(' fallback ')),
    };

    const generator = new FallbackReplyGenerator(primary, fallback);

    const reply = await generator.generate({ chatId: '123', incomingText: 'hi' });

    expect(reply).toBe('fallback');
    expect(primary.generate).toHaveBeenCalledTimes(1);
    expect(fallback.generate).toHaveBeenCalledTimes(1);
  });

  it('uses fallback when primary throws', async () => {
    const primary: ReplyGeneratorPort = {
      generate: vi.fn(() => Promise.reject(new Error('boom'))),
    };
    const fallback: ReplyGeneratorPort = {
      generate: vi.fn(() => Promise.resolve('fallback')),
    };

    const generator = new FallbackReplyGenerator(primary, fallback);

    const reply = await generator.generate({ chatId: '123', incomingText: 'hi' });

    expect(reply).toBe('fallback');
    expect(primary.generate).toHaveBeenCalledTimes(1);
    expect(fallback.generate).toHaveBeenCalledTimes(1);
  });
});
