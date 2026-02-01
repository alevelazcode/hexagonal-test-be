import type { GenerateReplyInput, ReplyGeneratorPort } from '@domain/messaging/ports/reply-generator.port';
import { GoogleGenAI } from '@google/genai';

export class GeminiReplyGenerator implements ReplyGeneratorPort {
  private readonly ai: GoogleGenAI;

  constructor(private readonly apiKey: string) {
    this.ai = new GoogleGenAI({ vertexai: false, apiKey: this.apiKey });
  }

  async generate(input: GenerateReplyInput): Promise<string> {
    const normalized = input.incomingText.trim();
    const prompt =
      `You are an assistant replying to a Telegram chat. Reply briefly and helpfully.\n` +
      `Chat ID: ${input.chatId}\n` +
      `User message: ${normalized}\n` +
      `Reply:`;

    try {
      const response = await this.ai.models.generateContent({
        model: 'gemini-2.0-flash',
        contents: prompt,
      });

      const text = typeof response.text === 'string' ? response.text.trim() : '';

      if (text.length > 0) {
        return text;
      }
    } catch (_error) {
      void _error;
    }

    return normalized.length > 0 ? `Echo: ${normalized}` : 'Echo';
  }
}
