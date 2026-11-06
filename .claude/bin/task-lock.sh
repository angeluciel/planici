#!/usr/bin/env bash
# Locks the session to an approved spec's plan. The scope-lock hook enforces the paths,
# the anchor hook repeats the task every turn.
#
#   task-lock.sh start SPEC-XXXX [AC-XXXX-NN ...]   checks preconditions, writes .claude/state/task.json
#   task-lock.sh add '<glob>'                        widen scope (owner-approved only)
#   task-lock.sh status
#   task-lock.sh check                               list files changed since the lock that are outside its scope
#   task-lock.sh clear
#
# Preconditions for start (from the spec's frontmatter):
#   status: Approved   plan_status: Approved   every depends_on spec is Implemented
# Paths come from the ```scope block in the spec's Implementation plan.
set -euo pipefail

root=$(git rev-parse --show-toplevel)
state="$root/.claude/state"
lock="$state/task.json"

fail() {
	echo "task-lock: $*" >&2
	exit 1
}
command -v jq >/dev/null 2>&1 || fail "jq is required"

field() { # field <name> <file>: frontmatter value without trailing comment
	awk -v k="$1" 'NR==1 && /^---/ {fm=1; next} fm && /^---/ {exit}
		fm && $0 ~ "^"k":" {sub("^"k":[[:space:]]*", ""); sub("[[:space:]]*#.*$", ""); print; exit}' "$2"
}
spec_file() { # spec_file SPEC-XXXX -> repo-relative path
	local f
	f=$(cd "$root" && ls docs/specs/"$1"-*.md 2>/dev/null | head -1) || true
	[ -n "$f" ] || fail "no docs/specs/$1-*.md"
	echo "$f"
}

case "${1:-}" in
start)
	[ $# -ge 2 ] || fail "usage: task-lock.sh start SPEC-XXXX [AC-XXXX-NN ...]"
	spec=$2
	shift 2
	[ -f "$lock" ] && fail "a task is already locked ($(jq -r .spec "$lock")). Run /done or task-lock.sh clear first."
	rel=$(spec_file "$spec")
	f="$root/$rel"

	status=$(field status "$f")
	[ "$status" = "Approved" ] || fail "$spec status is '$status'; only Approved specs may be implemented."
	plan=$(field plan_status "$f")
	[ "$plan" = "Approved" ] || fail "$spec plan_status is '${plan:-missing}'; the owner must approve the plan first (/plan)."

	deps=$(field depends_on "$f" | tr -d '[]' | tr ',' '\n' | tr -d ' ')
	for d in $deps; do
		ds=$(field status "$root/$(spec_file "$d")")
		[ "$ds" = "Implemented" ] || fail "dependency $d is '$ds', not Implemented."
	done

	paths=$(awk '/^```scope[[:space:]]*$/ {f=1; next} f && /^```/ {exit} f && NF {gsub(/^[[:space:]]+|[[:space:]]+$/, ""); print}' "$f")
	[ -n "$paths" ] || fail "no \`\`\`scope block in $rel's Implementation plan."

	all_acs=$(grep -oE "AC-${spec#SPEC-}-[0-9]{2}" "$f" | sort -u)
	if [ $# -gt 0 ]; then
		for ac in "$@"; do grep -qx "$ac" <<<"$all_acs" || fail "$ac is not defined in $rel."; done
		acs=$(printf '%s\n' "$@")
	else
		acs=$all_acs
	fi
	[ -n "$acs" ] || fail "no acceptance criteria found in $rel."

	mkdir -p "$state"
	jq -n --arg spec "$spec" --arg specFile "$rel" --arg at "$(date -u +%FT%TZ)" \
		--arg base "$(git -C "$root" rev-parse --short HEAD)" \
		--arg acs "$acs" --arg paths "$paths" \
		'{spec: $spec, specFile: $specFile, lockedAt: $at, baseCommit: $base,
		  acs: ($acs | split("\n") | map(select(length > 0))),
		  paths: ($paths | split("\n") | map(select(length > 0)))}' >"$lock"
	cat "$lock"
	;;
add)
	[ -f "$lock" ] || fail "no task is locked"
	[ $# -eq 2 ] || fail "usage: task-lock.sh add '<glob>'"
	tmp=$(mktemp)
	jq --arg g "$2" '.paths += [$g] | .paths |= unique' "$lock" >"$tmp" && mv "$tmp" "$lock"
	cat "$lock"
	;;
status)
	if [ -f "$lock" ]; then cat "$lock"; else echo "no task locked"; fi
	;;
check)
	# The scope-lock hook only sees file tools. This catches writes made through Bash (drizzle-kit, lint:fix).
	[ -f "$lock" ] || fail "no task is locked"
	base=$(jq -r .baseCommit "$lock")
	spec_rel=$(jq -r .specFile "$lock")
	globs=()
	while IFS= read -r glob; do globs+=("$glob"); done < <(jq -r '.paths[]' "$lock")
	out=()
	while IFS= read -r f; do
		[ "$f" = "$spec_rel" ] && continue
		in_scope=
		for glob in "${globs[@]}"; do
			# shellcheck disable=SC2053 # unquoted on purpose: glob match, and * crosses "/"
			if [[ "$f" == $glob ]]; then
				in_scope=1
				break
			fi
		done
		[ -n "$in_scope" ] || out+=("$f")
	done < <(cd "$root" && { git diff --name-only "$base"; git ls-files --others --exclude-standard; } | sort -u)
	if [ ${#out[@]} -gt 0 ]; then
		echo "task-lock: changed outside scope since $base:" >&2
		printf '  %s\n' "${out[@]}" >&2
		exit 1
	fi
	echo "all changes since $base are in scope"
	;;
clear)
	rm -f "$lock"
	echo "task lock cleared"
	;;
*)
	fail "usage: task-lock.sh start|add|status|check|clear"
	;;
esac
