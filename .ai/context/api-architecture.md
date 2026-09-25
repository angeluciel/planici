---
owner: api-engineer
sources:
  - apps/api/src/**
  - apps/api/test/**
  - packages/transactional/**
verified_at: 375b5d9
---
# API architecture — context card

NestJS 12 + @nestjs/cqrs, hexagonal. See apps/api/AGENTS.md for the folder layout.

## Endpoints (v1, root `auth`)
login · logout · register · refresh-session · request-email-code · verify-email-code ·
request-password-reset · reset-password · GET check-availability · GET me (JWT guard)

## Request pipeline
Controller (`@Body({ schema, pipes: [new ZodBody(S)] })`, `@Throttle`) → `CommandBus.execute(new XCommand(body, contextOf(req)))`
→ handler (uses ports) -> domain errors -> `DomainExceptionFilter` -> `ApiErrorBody`. Trace interceptor on all requests.

## Events
Domain events (`domain/events/auth.events.ts`) -> `event-handlers/*` -> MailService (console | SES) with templates from packages/transactional.

## Tests
Unit: handler specs with fake ports. E2E: test/e2e against a Testcontainers Postgres 17; global setup runs drizzle migrations from apps/api/drizzle.
