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
- API port: apps/api/.env.example PORT=3000, compose 3030, web API_URL :3333.
- docker/compose.yaml references `backend` / `apps/backend` paths that don't exist.
- No app Postgres service in compose (e2e uses Testcontainers `postgres:17`, so Docker is required to run it).
- Sonar coverage only covers apps/api.
