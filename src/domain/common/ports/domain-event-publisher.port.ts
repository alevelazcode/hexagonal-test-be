import type { DomainEvent } from '../events/domain-event';

export interface DomainEventPublisherPort {
  publish(event: DomainEvent): Promise<void>;
}
