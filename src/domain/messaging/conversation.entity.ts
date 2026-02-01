import type { TelegramChatId } from './value-objects/telegram-chat-id.value-object';

export interface ConversationProps {
  id: string;
  telegramChatId: TelegramChatId;
  createdAt: Date;
  lastMessageAt: Date;
}

export class Conversation {
  private constructor(private readonly props: ConversationProps) {}

  static create(input: ConversationProps): Conversation {
    return new Conversation({
      ...input,
    });
  }

  get id(): string {
    return this.props.id;
  }

  get telegramChatId(): TelegramChatId {
    return this.props.telegramChatId;
  }

  get createdAt(): Date {
    return this.props.createdAt;
  }

  get lastMessageAt(): Date {
    return this.props.lastMessageAt;
  }

  touch(lastMessageAt: Date): Conversation {
    return Conversation.create({
      ...this.props,
      lastMessageAt,
    });
  }
}
