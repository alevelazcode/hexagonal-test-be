import { GeminiReplyGenerator } from '@infrastructure/messaging/gemini-reply.generator';
import { describe, expect, it, vi } from 'vitest';

const generateContentMock = vi.fn();

vi.mock('@google/genai', () => {
  class GoogleGenAI {
    models = {
      generateContent: generateContentMock,
    };

    constructor(_opts: unknown) {
      void _opts;
    }
  }

  return { GoogleGenAI };
});

describe('GeminiReplyGenerator', () => {
  it('calls Gemini with expected model and prompt and returns trimmed response text', async () => {
    generateContentMock.mockResolvedValueOnce({ text: ' hola ' });

    const generator = new GeminiReplyGenerator('api-key');
    const reply = await generator.generate({ chatId: '123', incomingText: '  Hola  ' });

    expect(reply).toBe('hola');

    expect(generateContentMock).toHaveBeenCalledTimes(1);
    const callArg: unknown = generateContentMock.mock.calls[0]?.[0];
    if (typeof callArg !== 'object' || callArg === null || !('contents' in callArg)) {
      throw new Error('Invalid generateContent call arg');
    }

    if (!('model' in callArg)) {
      throw new Error('Invalid generateContent call arg');
    }

    const { model } = callArg as { model: unknown };
    if (model !== 'gemini-2.0-flash') {
      throw new Error('Invalid generateContent model');
    }

    const { contents } = callArg as { contents: unknown };
    if (typeof contents !== 'string') {
      throw new Error('Invalid generateContent contents');
    }

    expect(contents).toContain('User message: Hola');
    expect(contents).toContain('Guidelines:');
    expect(contents).toContain('- Reply in the same language as the user.');
    expect(contents).toContain('- Be brief (max 2 sentences).');
  });

  it('returns empty string when Gemini returns empty text', async () => {
    generateContentMock.mockResolvedValueOnce({ text: '   ' });

    const generator = new GeminiReplyGenerator('api-key');
    const reply = await generator.generate({ chatId: '123', incomingText: ' hi ' });

    expect(reply).toBe('');
  });

  it('propagates the error when Gemini throws', async () => {
    generateContentMock.mockRejectedValueOnce(new Error('boom'));

    const generator = new GeminiReplyGenerator('api-key');
    await expect(generator.generate({ chatId: '123', incomingText: ' hi ' })).rejects.toThrow('boom');
  });
});
