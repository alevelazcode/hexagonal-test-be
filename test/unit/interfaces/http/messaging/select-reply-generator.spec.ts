import { EchoReplyGenerator } from '@infrastructure/messaging/echo-reply.generator';
import { GeminiReplyGenerator } from '@infrastructure/messaging/gemini-reply.generator';
import { selectReplyGenerator } from '@interfaces/http/messaging/messaging.http.module';
import { describe, expect, it } from 'vitest';

describe('selectReplyGenerator', () => {
  it('returns EchoReplyGenerator in test env even when api key exists', () => {
    const generator = selectReplyGenerator('test', 'some-key');

    expect(generator).toBeInstanceOf(EchoReplyGenerator);
  });

  it('returns EchoReplyGenerator when api key is missing', () => {
    const generator = selectReplyGenerator('development', undefined);

    expect(generator).toBeInstanceOf(EchoReplyGenerator);
  });

  it('returns GeminiReplyGenerator when not test env and api key exists', () => {
    const generator = selectReplyGenerator('development', 'some-key');

    expect(generator).toBeInstanceOf(GeminiReplyGenerator);
  });
});
