import type { DomainEvent } from '@domain/common/events/domain-event';
import type { DomainEventPublisherPort } from '@domain/common/ports/domain-event-publisher.port';

export class NoopDomainEventPublisher implements DomainEventPublisherPort {
  publish(_event: DomainEvent): Promise<void> {
    void _event;
    return Promise.resolve();
  }
}
