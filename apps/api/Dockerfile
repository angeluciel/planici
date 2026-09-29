FROM ghcr.io/pnpm/pnpm:12 AS base
RUN pnpm runtime set node 26.5 -g
WORKDIR /repo

FROM base AS build
COPY pnpm-lock.yaml pnpm-workspace.yaml ./
RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm fetch

COPY . .
RUN --mount=type=cache,id=pnpm,target=/pnpm/store \
  pnpm ci --offline

RUN pnpm --filter=api... run build

RUN pnpm --filter=api deploy --prod /prod/api

FROM node:26.5-slim
ENV NODE_ENV=production
WORKDIR /app
COPY --from=build --chown=node:node /prod/api ./
USER node
EXPOSE 5000
CMD ["node", "dist/index.js"]