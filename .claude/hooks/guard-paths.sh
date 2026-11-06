#!/usr/bin/env bash
# PreToolUse (Read|Edit|Write|MultiEdit|NotebookEdit)
# Protects secrets and generated files. Exit 2 = block; stderr is sent back to Claude.
# Fails closed: without jq it cannot inspect the call, so it blocks.

if ! command -v jq >/dev/null 2>&1; then
	echo "Blocked: jq is not installed, so the path guard cannot run. Ask the owner to install jq." >&2
	exit 2
fi

input=$(cat)
tool=$(jq -r '.tool_name // empty' <<<"$input")
file=$(jq -r '.tool_input.file_path // .tool_input.notebook_path // empty' <<<"$input")
[ -z "$file" ] && exit 0

base=$(basename "$file")
case "$base" in
	*.example) ;; # .env.example, .env.dev.example, .env.compose.example are fine
	.env | .env.* | *.env)
		echo "Blocked: .env files are off-limits for reading and writing. Ask the owner for the value you need, or use a differently named file in the scratchpad for tests." >&2
		exit 2
		;;
esac

[ "$tool" = "Read" ] && exit 0

case "$file" in
	*apps/api/drizzle/meta/*)
		echo "Blocked: apps/api/drizzle/meta is generated. Change the schema and run drizzle-kit generate (skill drizzle-migration)." >&2
		exit 2
		;;
	*pnpm-lock.yaml)
		echo "Blocked: pnpm-lock.yaml only changes through pnpm install/add/remove." >&2
		exit 2
		;;
esac
exit 0
