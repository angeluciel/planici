---
name: cqrs-command
description: Add a new use case (command or query) to the Planici NestJS API following the existing CQRS + ports/adapters slice. Use when adding an endpoint or business operation in apps/api.
---
# Add a CQRS use case

Reference implementation: `apps/api/src/modules/auth/commands/login/`.

1. **Contract** exists in `@planici/schemas` (else emit `needs` → contracts-owner).
2. `commands/<verb-noun>/<verb-noun>.command.ts`: class holding the parsed input and a request `context`.
3. `<verb-noun>.handler.spec.ts` **first**: one test per acceptance criterion, fake ports (in-memory repos).
4. `<verb-noun>.handler.ts`: `@CommandHandler(X)`, depends on **ports** (`ports/…`) only; throws domain
   errors from `domain/errors`; publishes domain events for side effects (email, audit).
5. `<verb-noun>.http.controller.ts`: thin, same decorators as login (`@Controller({ path: routesV1.<ctx>.root, version: '1' })`,
   `@Body({ schema, pipes: [new ZodBody(S)] })`, `@Throttle` on public writes, swagger `@ApiOperation`/`@ApiResponse`).
6. New repository method → port interface in `ports/repositories`, Drizzle impl in `infrastructure/persistence`, mapper for rows ↔ entity.
7. Register handler + controller in `<ctx>.module.ts`. New route root → `src/config/app.routes.ts`.
8. Queries: same, under `queries/<get-x>/` with `*.query.ts`, `*.handler.ts`, `*.http.ts`.
9. Add/extend an e2e case in `test/e2e/` when the endpoint is user-facing.
10. `pnpm --filter api lint && pnpm --filter api typecheck && pnpm --filter api test`.
