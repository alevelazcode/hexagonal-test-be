import { EchoReplyGenerator } from '@infrastructure/messaging/echo-reply.generator';
import { describe, expect, it } from 'vitest';

describe('EchoReplyGenerator', () => {
  it('echoes trimmed content', async () => {
    const generator = new EchoReplyGenerator();

    const reply = await generator.generate({ chatId: '123', incomingText: ' hi ' });

    expect(reply).toBe('Echo: hi');
  });
});
