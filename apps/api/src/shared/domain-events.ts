/**
 * Marker for the events the auth aggregate publishes.
 * They are dispatched on the in-proccess CQRS event bus
 * */

export abstract class DomainEvent {
  readonly occurredAt: Date = new Date();
}
