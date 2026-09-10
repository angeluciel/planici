import { DomainEvent } from '@/shared/domain-events.js';

/** Raised before the account exists */
export class EmailCodeRequestedEvent extends DomainEvent {
  constructor(
    readonly email: string,
    readonly code: string,
    readonly expiredInMinutes: number,
  ) {
    super();
  }
}

export class UserRegisteredEvent extends DomainEvent {
  constructor(
    readonly userId: string,
    readonly email: string,
    readonly name: string,
  ) {
    super();
  }
}

export class PasswordResetRequestedEvent extends DomainEvent {
  constructor(
    readonly userId: string,
    readonly email: string,
    readonly name: string,
    readonly token: string,
    readonly expiresInMinutes: number,
  ) {
    super();
  }
}

export class PasswordChangedEvent extends DomainEvent {
  constructor(
    readonly userId: string,
    readonly email: string,
  ) {
    super();
  }
}
