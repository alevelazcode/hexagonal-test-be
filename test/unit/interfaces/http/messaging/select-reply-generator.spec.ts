import { EchoReplyGenerator } from '@infrastructure/messaging/echo-reply.generator';
import { FallbackReplyGenerator } from '@infrastructure/messaging/fallback-reply.generator';
import { GeminiReplyGenerator } from '@infrastructure/messaging/gemini-reply.generator';
import { RandomReplyGenerator } from '@infrastructure/messaging/random-reply.generator';
import { selectReplyGenerator } from '@interfaces/http/messaging/messaging.http.module';
import { describe, expect, it } from 'vitest';

describe('selectReplyGenerator', () => {
  it('returns EchoReplyGenerator in test env even when api key exists', () => {
    const generator = selectReplyGenerator('test', 'some-key');

    expect(generator).toBeInstanceOf(EchoReplyGenerator);
  });

  it('returns RandomReplyGenerator when api key is missing', () => {
    const generator = selectReplyGenerator('development', undefined);

    expect(generator).toBeInstanceOf(RandomReplyGenerator);
  });

  it('returns FallbackReplyGenerator when not test env and api key exists', () => {
    const generator = selectReplyGenerator('development', 'some-key');

    expect(generator).toBeInstanceOf(FallbackReplyGenerator);
    expect(generator).not.toBeInstanceOf(GeminiReplyGenerator);
  });
});
