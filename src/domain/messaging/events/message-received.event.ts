import type { DomainEvent } from '@domain/common/events/domain-event';

export class MessageReceivedEvent implements DomainEvent {
  readonly type = 'message_received';

  constructor(
    readonly props: {
      messageId: string;
      conversationId: string;
      telegramChatId: string;
      telegramUpdateId: number;
      text: string;
      receivedAt: Date;
    },
  ) {}

  get occurredAt(): Date {
    return this.props.receivedAt;
  }
}
