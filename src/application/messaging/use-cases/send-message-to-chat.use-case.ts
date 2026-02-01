import type { ClockPort, IdGeneratorPort } from '@domain/common/ports';
import { Message } from '@domain/messaging';
import { ConversationNotFoundError } from '@domain/messaging/errors';
import type {
  ConversationRepositoryPort,
  MessageRepositoryPort,
  TelegramClientPort,
} from '@domain/messaging/ports';
import { MessageContent } from '@domain/messaging/value-objects';

import type { SendMessageToChatInput, SendMessageToChatResult } from './send-message-to-chat.types';

export class SendMessageToChatUseCase {
  constructor(
    private readonly conversationRepository: ConversationRepositoryPort,
    private readonly messageRepository: MessageRepositoryPort,
    private readonly telegramClient: TelegramClientPort,
    private readonly idGenerator: IdGeneratorPort,
    private readonly clock: ClockPort,
  ) {}

  async execute(input: SendMessageToChatInput): Promise<SendMessageToChatResult> {
    const conversation = await this.conversationRepository.findById(input.conversationId);
    if (!conversation) {
      throw new ConversationNotFoundError('Conversation not found');
    }

    const content = MessageContent.create(input.text);

    const sent = await this.telegramClient.sendMessage(conversation.telegramChatId.value, content.value);

    const now = this.clock.now();

    const message = Message.create({
      id: this.idGenerator.generate(),
      conversationId: conversation.id,
      telegramChatId: conversation.telegramChatId,
      direction: 'outbound',
      content,
      createdAt: now,
      telegramMessageId: sent.messageId,
    });

    await this.messageRepository.create(message);

    const updatedConversation = conversation.touch(now);
    await this.conversationRepository.update(updatedConversation);

    return {
      messageId: message.id,
      telegramMessageId: sent.messageId,
    };
  }
}
