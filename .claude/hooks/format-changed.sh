#!/usr/bin/env bash
# PostToolUse (Edit|Write|MultiEdit): format the edited file with the tool its package uses. Never blocks.

command -v jq >/dev/null 2>&1 || exit 0
file=$(jq -r '.tool_input.file_path // empty')
{ [ -z "$file" ] || [ ! -f "$file" ]; } && exit 0
cd "$CLAUDE_PROJECT_DIR" || exit 0

case "$file" in
	"$CLAUDE_PROJECT_DIR"/*) ;;
	/*) exit 0 ;;
esac

case "$file" in
	*.ts | *.tsx | *.js | *.jsx | *.mjs | *.cjs | *.json | *.css) ;;
	*) exit 0 ;;
esac

case "$file" in
	*/apps/api/drizzle/*) exit 0 ;; # generated
	*/apps/api/*) pnpm --filter api exec prettier --write "$file" >/dev/null 2>&1 ;;
	*) pnpm exec biome check --write "$file" >/dev/null 2>&1 ;;
esac
exit 0
