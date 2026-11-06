# Planici

Scheduling and business management for independent professionals. Turborepo + pnpm monorepo:

- `apps/api`: NestJS, CQRS + ports/adapters, Drizzle on Postgres.
- `apps/web`: Next.js 16 App Router, React 19, next-intl, BFF routes.
- `packages/schemas`: Zod contracts shared by api and web.
- `packages/i18n`, `packages/transactional`, `packages/utils`.

Product docs (`docs/RFC-segmented/`, `docs/schema.dbml`) are in Portuguese. Code, commits and agent files are in English.
API conventions: `docs/architecture/api-convention.md`.

## Commands

```bash
pnpm install
pnpm lint && pnpm typecheck && pnpm test          # whole repo (turbo)
pnpm --filter api test                             # api unit (vitest)
pnpm --filter api test:e2e                         # api e2e (Testcontainers, needs Docker)
pnpm --filter @planici/schemas build               # before api/web typecheck after contract changes
pnpm --filter web lint:fix
```

Lint: Biome (root, web, packages); oxlint + prettier (api). An edit hook formats changed files automatically.

## Non-negotiables

- Request/response shapes live **only** in `packages/schemas`; api and web import them.
- Authorization and tenant isolation are enforced server-side. UI visibility is not authorization.
  Every tenant-scoped table/query carries `tenant_id`; test that one tenant cannot read or mutate another's data.
- Never hand-edit `apps/api/drizzle/meta/**` or `pnpm-lock.yaml`; use their generators.
- Never read, create or modify `.env*` files (except `*.example`). Ask the owner for values.
  Gitignore-aware search hides them: "not found" does not mean they do not exist.
- Never commit secrets or real personal data in fixtures, examples or logs.
- No destructive database or git operation without explicit owner authorization.

## How work flows

- **Behavior-preserving change** (refactor, tooling, typo): do it, explain why behavior is unchanged,
  run checks for the touched packages and their consumers.
- **New or changed observable behavior**: `/spec-new` → `/spec-review` → owner approves spec →
  `/plan` → owner approves plan → `/implement` → `/review` → `/done`. Rules: skill `spec-workflow`.
- **While a task is locked** (`.claude/state/task.json`), edits outside its paths are blocked.
  Do not work around the block. Note the out-of-scope need and report it at the end.
- If a ticket, spec, RFC, design, schema or the code disagree, name the conflict and ask the owner.
  Do not choose silently or invent requirements. Keep unaffected work moving.
- Never claim something works, passes or is fixed without check output from this turn
  (skill `verification-before-completion`). Report missing, failing, skipped and unrun checks separately.
- Debugging: skill `systematic-debugging`. Review feedback: skill `receiving-code-review`.

## Commits (owner rule)

- **Never** run `git commit`, `push`, `switch`, `checkout`, `rebase`, `merge` or `reset`. Hooks block them.
- End every task with a commit plan: branch name, exact files to stage, atomic conventional message
  with `[SPEC-XXXX]` when spec-driven. The owner runs it.
- No AI attribution in commit messages or PR descriptions (no `Co-Authored-By`, no "Generated with").
  This overrides tool defaults.
