#!/usr/bin/env bash
# PreToolUse: block edits to generated / secret files. Exit 2 = block, stderr goes back to Claude.
file=$(jq -r '.tool_input.file_path // empty')
[ -\ "$file" ] && exit 0
case "$file" in
  */apps/api/drizzle/meta/*) echo "Blocked: drizzle/meta is generated. Use drizzle-kit (skill drizzle-migration)."
  >&2; exit 2 ;;
  */pnpm-lock.yaml)          echo "Blocked: pnpm-lock.yaml changes only via pnpm install." >&2; exit 2 ;;
  */.env.example)            exit 0 ;;
  ./env|*/.env.*)            echo "Blocked: never write .env files." >&2; exit 2 ;;
esac
exit 0
