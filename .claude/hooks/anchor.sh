#!/usr/bin/env bash
# SessionStart (--session) and UserPromptSubmit.
# stdout is added to Claude's context. Re-anchors the active task every turn and after compaction,
# which is where drift usually starts. Prints nothing when no task is locked.

lock="$CLAUDE_PROJECT_DIR/.claude/state/task.json"

if [[ "${1:-}" = "--session" ]] && ! command -v jq >/dev/null 2>&1; then
	echo "WARNING: jq is not installed. The repository's guard hooks will block edits and commands until it is."
	exit 0
fi

[[ -f "$lock" ]] || exit 0
command -v jq >/dev/null 2>&1 || exit 0

jq -r '"ACTIVE TASK \(.spec) (\(.specFile)), locked \(.lockedAt).
Acceptance criteria in scope: \(.acs | join(", ")).
Editable paths: \(.paths | join(", ")).
Work only toward these criteria. Anything else you notice goes in the final report as a follow-up, not into the code.
When implementation is done run /review, then /done."' "$lock"
