#!/usr/bin/env bash
# PostToolUse format the file that was just edited, with the tool its package uses. Never Blocks.
file=$(jq -r '.tool_input.file_path //empty')
[ -z "$file" ] || [ ! -f "$file" ] && exit 0
cd "$CLAUDE_PROJECT_DIR" || exit 0
case "$file" in
  *.ts|*.tsx|*.js|*.jsx|*.json|*.css) ;;
  *) exit 0;;
esac
case "$file" in
  */apps/api/*) pnpm --filter api exec prettier --write "$file" > /dev/null 2>&1 ;;
  *)            pnpm exec biome check --write "$file" >/dev/null 2>&1 ;;
esac
exit 0
