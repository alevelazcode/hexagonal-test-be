import type { MessageContent } from './value-objects/message-content.value-object';
import type { TelegramChatId } from './value-objects/telegram-chat-id.value-object';

export type MessageDirection = 'inbound' | 'outbound';

export interface MessageProps {
  id: string;
  conversationId: string;
  telegramChatId: TelegramChatId;
  direction: MessageDirection;
  content: MessageContent;
  createdAt: Date;
  telegramUpdateId?: number;
  telegramMessageId?: number;
}

export class Message {
  private constructor(private readonly props: MessageProps) {}

  static create(input: MessageProps): Message {
    return new Message({
      ...input,
    });
  }

  get id(): string {
    return this.props.id;
  }

  get conversationId(): string {
    return this.props.conversationId;
  }

  get telegramChatId(): TelegramChatId {
    return this.props.telegramChatId;
  }

  get direction(): MessageDirection {
    return this.props.direction;
  }

  get content(): MessageContent {
    return this.props.content;
  }

  get createdAt(): Date {
    return this.props.createdAt;
  }

  get telegramUpdateId(): number | undefined {
    return this.props.telegramUpdateId;
  }

  get telegramMessageId(): number | undefined {
    return this.props.telegramMessageId;
  }
}
