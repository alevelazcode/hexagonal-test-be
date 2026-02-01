import type { PaginatedResult } from '@application/common/pagination.types';
import type { Conversation } from '@domain/messaging';
import type { ConversationRepositoryPort } from '@domain/messaging/ports';

import type { ListConversationsInput } from './list-conversations.types';

export class ListConversationsUseCase {
  constructor(private readonly conversationRepository: ConversationRepositoryPort) {}

  async execute(input?: ListConversationsInput): Promise<PaginatedResult<Conversation>> {
    const conversations = await this.conversationRepository.list();

    const sorted = [...conversations].sort(
      (a, b) => b.lastMessageAt.getTime() - a.lastMessageAt.getTime() || a.id.localeCompare(b.id),
    );

    const page = input?.page ?? 1;
    const pageSize = input?.pageSize ?? 25;

    const start = (page - 1) * pageSize;
    const items = sorted.slice(start, start + pageSize);

    return {
      items,
      page,
      pageSize,
      total: sorted.length,
    };
  }
}
