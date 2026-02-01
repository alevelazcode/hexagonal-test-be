import type { PaginatedResult } from '@application/common/pagination.types';
import type { Conversation } from '@domain/messaging';
import type { ConversationRepositoryPort } from '@domain/messaging/ports';

import type { ListConversationsInput } from './list-conversations.types';

export class ListConversationsUseCase {
  constructor(private readonly conversationRepository: ConversationRepositoryPort) {}

  async execute(input?: ListConversationsInput): Promise<PaginatedResult<Conversation>> {
    const page = input?.page ?? 1;
    const pageSize = input?.pageSize ?? 25;

    const { items, total } = await this.conversationRepository.list({
      page,
      pageSize,
    });

    return {
      items,
      page,
      pageSize,
      total,
    };
  }
}
