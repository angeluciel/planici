#!/usr/bin/env bash
# PreToolUse (Edit|Write|MultiEdit|NotebookEdit)
# While .claude/state/task.json exists, only paths matching its globs may be edited.
# Files outside the project (scratchpad, /tmp) are never restricted.
# Always allowed: the active spec file (changelog / plan status).

lock="$CLAUDE_PROJECT_DIR/.claude/state/task.json"
[ -f "$lock" ] || exit 0

if ! command -v jq >/dev/null 2>&1; then
	echo "Blocked: jq is not installed, so the scope lock cannot run. Ask the owner to install jq." >&2
	exit 2
fi

input=$(cat)
file=$(jq -r '.tool_input.file_path // .tool_input.notebook_path // empty' <<<"$input")
[ -z "$file" ] && exit 0

case "$file" in
	"$CLAUDE_PROJECT_DIR"/*) rel=${file#"$CLAUDE_PROJECT_DIR"/} ;;
	/*) exit 0 ;; # outside the project
	*) rel=${file#./} ;;
esac

[ "$rel" = "$(jq -r '.specFile // empty' "$lock")" ] && exit 0

while IFS= read -r glob; do
	[ -z "$glob" ] && continue
	# shellcheck disable=SC2053 # unquoted on purpose: glob match, and * crosses "/"
	[[ "$rel" == $glob ]] && exit 0
done < <(jq -r '.paths[]' "$lock")

spec=$(jq -r '.spec' "$lock")
echo "Blocked: $rel is outside the approved plan for $spec. Do not work around this. If the change is needed, stop and report it as a proposed plan change; the owner can extend scope with .claude/bin/task-lock.sh add '<glob>'." >&2
exit 2
