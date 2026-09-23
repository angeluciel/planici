FROM ghcr.io/pnpm/pnpm:12 AS base
RUN pnpm runtime setnode 22 -g

FROM base AS build
COPY . /usr/src/app
WORKDIR /usr/src/app
RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm ci
RUN pnpm run -r build
RUN pnpm deploy --filter=planici --prod /prod/planici

FROM base AS planici
COPY --from=build /prod/planici /prod/planici
WORKDIR /prod/planici
CMD ["pnpm", "-w", "start"]