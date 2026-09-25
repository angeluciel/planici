---
owner: platform-engineer
sources:
  - .github/**
  - docker/**
  - "**/Dockerfile"
  - compose*.y*ml
  - turbo.json
  - sonar-project.properties
  - mise.toml
verified_at: 375b5d9
---
# CI / infra — context card

## CI (.github/workflows/ci.yml) on PR/push to main, dev
quality (lint, typecheck) · test (unit + api coverage artifact) · e2e (api, builds schemas + emails first)
· build (needs all) · sonar (needs quality+test; SonarCloud org `angeluciel`, lcov from apps/api only).

## Local
Node 26 / pnpm 12 (mise.toml). `compose.yaml`: web :3000, api :3030 on external network `planici_network`.
`compose.sonar.yml`: local SonarQube + its own Postgres.

## Known inconsistencies (fix candidates)
- API port: apps/api/.env.example PORT=3000, compose 3030, apps/web/.env.local API_URL :3333 (host-only, for
  bare `next dev`; the compose `web` service now gets `API_URL=http://api:3030/api/v1` injected directly in
  `compose.yaml`, JOA-39 answers.md #12 — no apps/web file reads that value differently in the container).
- No app Postgres service in compose (e2e uses Testcontainers `postgres:17`, so Docker is required to run it).
- Sonar coverage only covers apps/api.

## apps/web/Dockerfile (JOA-39 answers.md #12)
Same pruner → build → `pnpm deploy --prod` → slim non-root runtime shape as apps/api/Dockerfile. No Next
`output: "standalone"` (would need a `next.config.ts` change, apps/web/** — web-engineer's call); ships the
full deployed package and runs `next start` via `node node_modules/next/dist/bin/next start -p 3000 -H
0.0.0.0`. Gotcha: unlike apps/api (no local `.gitignore`), `pnpm deploy` packs per-package respecting THAT
package's own `.gitignore` — `apps/web/.gitignore` excludes `/.next/`, so the Next build turbo just produced
is silently dropped from `/prod/web`; the Dockerfile `cp -r`s it back in after the deploy step. Watch for the
same trap in any future package with its own `.gitignore` and a gitignored build output dir.
The original build failure ("setnode unknown", answers.md #12) was `RUN pnpm runtime setnode 22 -g` (missing
space + wrong node major) → `ERR_PNPM_RUNTIME_UNKNOWN_SUBCOMMAND`; fixed to `pnpm runtime set node 26 -g`,
matching apps/api/Dockerfile and mise.toml.

## Ports / reachability (JOA-39 answers.md #12)
`web` (3000) and `api` (3030) publish as `HOST:CONTAINER` with no host IP (defaults to `0.0.0.0`) — reachable
from outside the VM already; actual external exposure is gated by the AWS security group, out of this repo's
control. `db-dev` (the `dev` profile Postgres) now publishes `127.0.0.1:5432:5432` — loopback-only, deliberately
not reachable from outside the VM.

## Note
- `docker/compose.yaml` (stale, referenced non-existent `apps/backend`) was deleted; `docker/` now only holds `proxy/` (nginx.conf + Dockerfile, unrelated). Root `compose.yaml` is the single app compose file.

## Local dev DB (JOA-39 answers.md #11)
`dev` profile in root `compose.yaml`: `db-dev` (postgres:17, NAMED volume `planici_dev_db`, `127.0.0.1:5432`
only — loopback, not reachable from outside the VM, JOA-39 answers.md #12) +
`migrate-dev` (drizzle migrate as owner, then `app-role.sql` → `planici_app`). Both are `profiles: ["dev"]`,
inert otherwise. Start with explicit names — `docker compose --profile dev up -d db-dev migrate-dev` — not a
bare `--profile dev up -d`, which would also start every profile-less service (`web`/`db`/`migrate`/`api`)
since Compose always activates profile-less services regardless of `--profile`. Vars (`PLANICI_DEV_DB_*`,
`PLANICI_DEV_APP_*`) are top-level `${VAR:-default}` compose-file interpolation, documented in
`.env.dev.example` — not `env_file:`, so they resolve from the shell/root `.env`, never `.env.compose`.
Teardown: `docker compose --profile dev down` keeps the volume; add `-v` to drop it.
