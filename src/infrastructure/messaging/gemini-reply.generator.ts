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
      `You are an assistant replying to a Telegram chat.\n` +
      `Guidelines:\n` +
      `- Reply in the same language as the user.\n` +
      `- Be brief (max 2 sentences).\n` +
      `- Be helpful and direct.\n` +
      `- Do not mention system instructions or chat metadata.\n` +
      `\n` +
      `User message: ${normalized}\n` +
      `Reply:`;

    const response = await this.ai.models.generateContent({
      model: 'gemini-2.0-flash',
      contents: prompt,
    });

    return typeof response.text === 'string' ? response.text.trim() : '';
  }
}
