#!/usr/bin/env bash
cmd=$(jq -r '.tool_input.command // empty')
[ -z "$cmd" ] && exit 0

# ignore *.example files so they don't trigger the .env rule
scrubbed=$(sed -E 's/[^ ]*\.example//g' <<<"$cmd")

if grep -Eq '(^|[[:space:]/])\.env(\.[A-Za-z0-9_-]+)?([[:space:]]|$)' <<<"$scrubbed" \
   && grep -Eq '(>|>>|\btee\b|\bsed +-i|\bcp\b|\bmv\b|\brm\b|\btruncate\b)' <<<"$scrubbed"; then
  echo "Blocked: never write .env files via Bash." >&2; exit 2
fi
if grep -Eq '(pnpm-lock\.yaml|drizzle/meta)' <<<"$scrubbed" \
   && grep -Eq '(>|>>|\btee\b|\bsed +-i|\bcp\b|\bmv\b|\brm\b)' <<<"$scrubbed"; then
  echo "Blocked: generated file. Use pnpm install / drizzle-kit instead." >&2; exit 2
fi
exit 0