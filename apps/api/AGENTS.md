# apps/api — NestJS 12, CQRS, ports & adapters

Read `.ai/context/api-architecture.md` first. Summary:

- `src/modules/<context>/`
  - `domain/` entities, value objects (`*.vo.ts`), domain errors, events — no Nest/Drizzle imports
  - `ports/` interfaces (repositories, services) — the domain depends on these
  - `infrastructure/` Drizzle repositories, mappers, external services (adapters)
  - `commands/<verb-noun>/` `*.command.ts`, `*.handler.ts`, `*.http.controller.ts`, `*.handler.spec.ts`
  - `queries/<get-x>/` `*.query.ts`, `*.handler.ts`, `*.http.ts`
  - `event-handlers/` side effects (e.g. emails via `packages/transactional`)
- `src/shared/` cross-cutting (Zod pipe, exception filter, crypto). `src/config/app.routes.ts` holds route roots.
- Controllers stay thin: validate with `ZodBody(schemas.X)`, build the command, `commands.execute(...)`.
- Imports use `@src/...` and ESM `.js` suffixes.
- Tests: unit `*.spec.ts` next to handlers (mock ports); e2e in `test/e2e/` via `test/utils/ApiClient.ts`.

Adding a use case → skill `cqrs-command`. Schema change → ask `data-steward` (skill `drizzle-migration`).
