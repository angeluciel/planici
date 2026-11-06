#!/usr/bin/env bash
file=$(jq -r '.tool_input.file_path // empty')
[ -z "$file" ] && exit 0
case "$file" in
  *.example) exit 0 ;;
  */apps/api/drizzle/meta/*)
    echo "Blocked: drizzle/meta is generated. Use drizzle-kit (skill drizzle-migration)." >&2; exit 2 ;;
  */pnpm-lock.yaml)
    echo "Blocked: pnpm-lock.yaml changes only via pnpm install." >&2; exit 2 ;;
  .env|.env.*|*/.env|*/.env.*)
    echo "Blocked: never write .env files." >&2; exit 2 ;;
esac
exit 0