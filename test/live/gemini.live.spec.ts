import { GeminiReplyGenerator } from '@infrastructure/messaging/gemini-reply.generator';
import { describe, expect, it } from 'vitest';

const shouldRun = process.env.RUN_LIVE_GEMINI_TESTS === 'true';

describe.skipIf(!shouldRun)('GeminiReplyGenerator (live)', () => {
  it('calls the real Gemini API and returns a non-empty reply', async () => {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY is required when RUN_LIVE_GEMINI_TESTS=true');
    }

    const generator = new GeminiReplyGenerator(apiKey);
    const reply = await generator.generate({
      chatId: '123',
      incomingText: 'Respond with exactly the single word: PING',
    });

    expect(reply.trim().length).toBeGreaterThan(0);
    expect(reply.toUpperCase()).toContain('PING');
    expect(reply).not.toContain('Guidelines:');
    expect(reply).not.toContain('User message:');
  }, 60_000);
});
