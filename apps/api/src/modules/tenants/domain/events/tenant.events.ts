import { DomainEvent } from '@src/shared/domain-events.js';

export class TenantCreatedEvent extends DomainEvent {
  constructor(
    readonly tenantId: string,
    readonly ownerId: string,
    readonly slug: string,
  ) {
    super();
  }
}

export class TenantRenamedEvent extends DomainEvent {
  constructor(
    readonly tenantId: string,
    readonly name: string,
  ) {
    super();
  }
}
