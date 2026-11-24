#!/usr/bin/env bash
# PreToolUse (Bash)
# Backstop for permissions.deny: catches the same actions inside compound commands,
# scripts run through sh -c, and .env access through cat/cp/source/etc.
# Exit 2 = block; stderr is sent back to Claude. Fails closed without jq.

if ! command -v jq >/dev/null 2>&1; then
	echo "Blocked: jq is not installed, so the command guard cannot run. Ask the owner to install jq." >&2
	exit 2
fi

cmd=$(jq -r '.tool_input.command // empty')
[[ -z "$cmd" ]] && exit 0

block() {
	echo "Blocked: $1" >&2
	exit 2
}

# Git actions reserved for the owner. Optional "-C <dir>" / "-c k=v" before the subcommand.
git_re='(^|[;&|({[:space:]])git([[:space:]]+-[cC][[:space:]]+[^[:space:]]+)*[[:space:]]+'
if grep -Eq "${git_re}(commit|push|switch|checkout|rebase|merge|reset|clean|cherry-pick|revert|am|tag)([[:space:]]|$)" <<<"$cmd"; then
	block "commits, pushes, branch changes and history rewrites are the owner's job. Finish with a commit plan (branch, files to stage, message) instead."
fi
if grep -Eq "${git_re}(restore([[:space:]]|$)|stash[[:space:]]+(drop|clear)|branch[[:space:]]+-[dD])" <<<"$cmd"; then
	block "this discards work. Ask the owner first."
fi
if grep -Eq -- '--no-verify|HUSKY=0|core\.hooksPath' <<<"$cmd"; then
	block "do not bypass git hooks. Fix whatever the hook reports."
fi

# .env files: any path token whose basename starts with .env and is not *.example.
while IFS= read -r tok; do
	tok=${tok#[\'\"=<> /]}
	case "$tok" in
		*.example) ;;
		*) block ".env files are off-limits ($tok). Ask the owner for the value you need." ;;
	esac
done < <(grep -oE '(^|[[:space:]/"'"'"'=<>])\.env[[:alnum:]_.-]*' <<<"$cmd")

# Destructive data operations.
if grep -Eq 'rm[[:space:]]+-[a-zA-Z]*[rR][a-zA-Z]*f|rm[[:space:]]+-[a-zA-Z]*f[a-zA-Z]*[rR]' <<<"$cmd"; then
	block "recursive force delete. Ask the owner, or delete specific files."
fi
if grep -Eiq 'docker[[:space:]]+compose[^;&|]*down[^;&|]*(-v|--volumes)|docker[[:space:]]+volume[[:space:]]+(rm|prune)' <<<"$cmd"; then
	block "this deletes database volumes. Ask the owner first."
fi
if grep -Eiq 'drizzle-kit[[:space:]]+(push|drop)|drop[[:space:]]+(table|schema|database)|truncate[[:space:]]+' <<<"$cmd"; then
	block "destructive schema operation. Generate a migration instead (skill drizzle-migration), or ask the owner."
fi

exit 0
