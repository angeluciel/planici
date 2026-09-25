# syntax=docker/dockerfile:1
#
# apps/web production image — JOA-39. Multi-stage, prod-only, mirrors
# apps/api/Dockerfile's pattern (pruner -> build -> pnpm deploy -> slim
# runtime). No `standalone` Next.js output (that needs a next.config.ts
# change, apps/web/** — web-engineer's domain per .ai/work/JOA-39
# answers.md #12/NEEDS); this ships the full pruned+deployed package and
# runs `next start` instead.

# ---------------------------------------------------------------------------
# base: pnpm CLI + the Node runtime pinned in mise.toml (node 26.5.0).
# `pnpm runtime set <name> <version>` is the correct subcommand — the
# previous `pnpm runtime setnode 22 -g` (missing space, wrong major) is
# JOA-39 answers.md #12's "setnode unknown" build failure
# (ERR_PNPM_RUNTIME_UNKNOWN_SUBCOMMAND: Unknown subcommand: setnode).
# ---------------------------------------------------------------------------
FROM ghcr.io/pnpm/pnpm:12 AS base
RUN pnpm runtime set node 26 -g

# ---------------------------------------------------------------------------
# pruner: turbo-prune the monorepo down to `web` + its workspace deps only
# (@planici/i18n, @planici/schemas) — smaller build context, no apps/api in
# the graph.
# ---------------------------------------------------------------------------
FROM base AS pruner
WORKDIR /usr/src/app
RUN pnpm add -g turbo@2.10.12
COPY . .
RUN turbo prune web --docker

# ---------------------------------------------------------------------------
# build: install with devDependencies (needed to compile), then build web
# and its workspace deps. `turbo run build --filter=web` depends on `^build`
# (turbo.json), so @planici/i18n's own `tsc -> dist` build (JOA-39 answers.md
# #5c) runs first — web's Next build resolves `@planici/i18n`'s package
# "exports" (./dist/index.js) rather than raw, un-type-stripped .ts.
# ---------------------------------------------------------------------------
FROM base AS build
WORKDIR /usr/src/app
COPY --from=pruner /usr/src/app/out/json/ .
RUN pnpm install --frozen-lockfile
COPY --from=pruner /usr/src/app/out/full/ .
RUN pnpm exec turbo run build --filter=web

# Prod-only deploy of the web package: package.json, next.config.ts, etc.
# (pnpm deploy copies the package dir, same as apps/api/Dockerfile) + only
# production node_modules (own + workspace deps resolved as real files —
# @planici/i18n's dist/ and messages/ included — no devDependencies, no
# symlinked workspace packages).
RUN pnpm deploy --filter=web --prod /prod/web
# Unlike apps/api (no local .gitignore, so `dist/` survives), `pnpm deploy`
# packs each package respecting ITS OWN .gitignore — apps/web/.gitignore
# excludes `/.next/`, so the build turbo just produced above is silently
# dropped from /prod/web. Copy it back explicitly rather than touching
# apps/web/.gitignore (out of scope, apps/web/**).
RUN cp -r apps/web/.next /prod/web/.next

# ---------------------------------------------------------------------------
# runtime: prod-only, non-root — the image that ships. Must be the last
# stage so a bare `docker build .` (no --target) produces it. Plain
# `node:26-slim` for the same reason as apps/api/Dockerfile: pnpm's own
# `pnpm runtime set node` installs a shim the non-root `node` user can't
# resolve. This stage never runs pnpm: CMD invokes Next's CLI entry point
# directly via `node`, not the `node_modules/.bin/next` shell shim (which
# would need its executable bit to survive --chmod).
# ---------------------------------------------------------------------------
FROM node:26-slim AS runtime
COPY --from=build --chmod=a+rX /prod/web /prod/web
WORKDIR /prod/web
ENV NODE_ENV=production
ENV PORT=3000
USER node
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD node -e "require('http').get('http://127.0.0.1:'+(process.env.PORT||3000)+'/',(r)=>{process.exit(r.statusCode<500?0:1)}).on('error',()=>process.exit(1))"
CMD ["node", "node_modules/next/dist/bin/next", "start", "-p", "3000", "-H", "0.0.0.0"]
