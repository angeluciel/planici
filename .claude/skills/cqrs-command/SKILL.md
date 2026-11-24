---
name: cqrs-command
description: Add a new use case (command or query) to the Planici NestJS API following the existing CQRS + ports/adapters slice. Use when adding an endpoint or business operation in apps/api.
---

# Add a CQRS use case

Reference implementation: `apps/api/src/modules/auth/commands/login/`. Read it before starting; follow it over this list if they differ.

1. **Contract** exists in `@planici/schemas`. If not, add it first (skill `api-contract`).
2. `commands/<verb-noun>/<verb-noun>.command.ts`: class holding the parsed input and the request `context`.
3. `<verb-noun>.handler.spec.ts` **first**: one or more tests per acceptance criterion, named with the AC ID,
   using fake ports (in-memory repositories). Confirm they fail for the right reason.
4. `<verb-noun>.handler.ts`: `@CommandHandler(X)`. Depends on **ports** (`ports/…`) only. Throws domain errors
   from `domain/errors` (no HTTP exceptions below the controller). Publishes domain events for side effects (e-mail, audit).
5. `<verb-noun>.http.controller.ts`: thin. Same decorators as login:
   `@Controller({ path: routesV1.<ctx>.root, version: '1' })`, `@Body({ schema, pipes: [new ZodBody(S)] })`,
   `@Throttle` on public writes, Swagger `@ApiOperation`/`@ApiResponse`. Tenant routes use `JwtAccessGuard` then
   `ActiveTenantGuard`, and the membership the guard resolved.
6. New repository method: port interface in `ports/repositories`, Drizzle implementation in
   `infrastructure/persistence`, mapper for rows ↔ entity. Every tenant-scoped query filters by `tenant_id`.
7. Register handler and controller in `<ctx>.module.ts`. New route root: `src/config/app.routes.ts`.
8. Queries: the same shape under `queries/<get-x>/` with `*.query.ts`, `*.handler.ts`, `*.http.ts`.
9. User-facing endpoint: add or extend an e2e case in `test/e2e/`, including the other-tenant case.
10. `pnpm --filter api lint && pnpm --filter api typecheck && pnpm --filter api test`.
