# syntax=docker/dockerfile:1
#
# apps/api production image — JOA-39. Multi-stage, prod-only. `runtime`
# (last stage, so a bare `docker build .` / ECS Fargate task build produces
# it) is the image that ships; `tools` is a build-time-only helper for the
# compose `migrate`/`smoke` services (never pushed/deployed).

# ---------------------------------------------------------------------------
# base: pnpm CLI + the Node runtime pinned in mise.toml (node 26.5.0)
# ---------------------------------------------------------------------------
FROM ghcr.io/pnpm/pnpm:12 AS base
RUN pnpm runtime set node 26 -g

# ---------------------------------------------------------------------------
# pruner: turbo-prune the monorepo down to `api` + its workspace deps only
# (@planici/schemas, @planici/emails, @planici/i18n) — smaller build context,
# no apps/web in the graph.
# ---------------------------------------------------------------------------
FROM base AS pruner
WORKDIR /usr/src/app
# Global, standalone turbo install — deliberately NOT a full `pnpm install`
# of the monorepo (that would pull in apps/web's whole toolchain just to
# compute the prune). Version pinned to the root workspace's resolved
# `turbo` (pnpm-lock.yaml) so prune behavior matches `pnpm run build`.
RUN pnpm add -g turbo@2.10.12
COPY . .
RUN turbo prune api --docker

# ---------------------------------------------------------------------------
# build: install with devDependencies (needed to compile), then build api
# and its workspace deps.
# ---------------------------------------------------------------------------
FROM base AS build
WORKDIR /usr/src/app
COPY --from=pruner /usr/src/app/out/json/ .
RUN pnpm install --frozen-lockfile
COPY --from=pruner /usr/src/app/out/full/ .
# `turbo prune` only copies root package.json/turbo.json/pnpm-workspace.yaml
# + each selected package's own files — not other root-level config. The
# root tsconfig.json is one such file (packages/transactional's
# tsconfig.build.json extends "../../tsconfig.json").
COPY tsconfig.json ./
RUN pnpm exec turbo run build --filter=api

# Prod-only deploy of the api package: dist/ + only production node_modules
# (own + workspace deps resolved as real files, no devDependencies, no
# symlinked workspace packages). This is what the `runtime` stage ships.
#
# `react-email` / `next-intl` are genuine runtime deps of `@planici/emails`
# (rendered per-request by apps/api's mail templates — see
# .ai/work/JOA-39/answers.md #6) and `zod-openapi` is a genuine runtime dep
# of apps/api's own `src/main.ts` (already reclassified into
# "dependencies", per .ai/work/JOA-39/api.md) — none of them are stripped
# here anymore; doing so previously broke every transactional email.
RUN pnpm deploy --filter=api --prod /prod/api

# ---------------------------------------------------------------------------
# tools: the prod-deployed api (`pnpm deploy` copies the whole package dir,
# so /prod/api already has drizzle/, drizzle.config.ts and src/ alongside
# dist/) + drizzle-kit (devDependency, added standalone here — much cheaper
# than deriving from `build`'s full monorepo node_modules) + psql. Used only
# by the compose `migrate`/`smoke` services. Not the image ECS runs.
# ---------------------------------------------------------------------------
FROM base AS tools
RUN apt-get update \
  && apt-get install -y --no-install-recommends postgresql-client \
  && rm -rf /var/lib/apt/lists/*
COPY --from=build /prod/api /prod/api
WORKDIR /prod/api
# Global install (not `pnpm add` into /prod/api's package.json): the
# `pnpm deploy` output has a flattened, peer-resolved lockfile that isn't a
# valid target for further `pnpm add`/resolution (`ERR_PNPM_SPEC_NOT_
# SUPPORTED_BY_ANY_RESOLVER` on its peer-qualified entries). Merge the whole
# global install's node_modules (drizzle-kit + its own nested deps —
# esbuild, its platform binary, etc. — pnpm's per-package isolated
# node_modules needs all of it, with symlinks kept relative, not
# dereferenced) into /prod/api/node_modules, so both `drizzle.config.ts`'s
# `import { defineConfig } from 'drizzle-kit'` and drizzle-kit's own
# `require('drizzle-orm')` (it checks the target project's version) resolve
# from /prod/api rather than following a symlink out to /pnpm/global first.
RUN pnpm add -g drizzle-kit@0.31.10 \
  && cp -r "$(dirname "$(find /pnpm/global -maxdepth 4 -name drizzle-kit | head -1)")"/. node_modules/

# ---------------------------------------------------------------------------
# runtime: prod-only, non-root — the image ECS Fargate runs. Must be the
# last stage so `docker build .` (no --target) produces it. Plain
# `node:26-slim` (not `base`/ghcr.io/pnpm/pnpm) on purpose: pnpm's own
# `pnpm runtime set node` installs a version-manager *shim* for `node`, not
# a real binary — it reads pnpm's global metadata to resolve the real
# runtime, which the non-root user below can't read, so it fails to start.
# A plain official Node image doesn't have that problem, is smaller, and
# already ships a non-root `node` user (uid 1000) — no groupadd/useradd
# needed. This stage never runs pnpm at all: CMD invokes `node dist/main.js`
# directly (what `start:prod`, apps/api/package.json, resolves to).
# ---------------------------------------------------------------------------
FROM node:26-slim AS runtime
# `pnpm deploy` also writes some of its own bookkeeping files root-owned;
# make sure the non-root `node` user can read everything it needs. Set
# permissions inline via COPY --chmod rather than a separate `RUN chmod -R`
# afterwards — a follow-up RUN would copy-up (duplicate) every file in this
# now much larger tree (react-email/next-intl are real runtime deps, see
# .ai/work/JOA-39/answers.md #6) into a second layer just to flip bits.
COPY --from=build --chmod=a+rX /prod/api /prod/api
WORKDIR /prod/api
ENV NODE_ENV=production
USER node
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD node -e "require('http').get('http://127.0.0.1:'+(process.env.PORT||3000)+'/api/health',(r)=>{process.exit(r.statusCode===200?0:1)}).on('error',()=>process.exit(1))"
CMD ["node", "dist/main.js"]
