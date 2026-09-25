#!/usr/bin/env bash
# Lists .ai/context cards whose `sources` changed since their `verified_at` commit.
# Usage: scripts/ai/stale-cards.sh [--quiet-if-none]
set -euo pipefail
cd "$(git rev-parse --show-toplevel)"
stale=()
for card in .ai/context/*.md; do
  [[ "$(basename "$card")" == _* ]] && continue
  sha=$(awk '/^verified_at:/{print $2; exit}' "$card")
  owner=$(awk '/^owner:/{print $2; exit}' "$card")
  mapfile -t globs < <(awk '/^sources:/{f=1;next} f&&/^  - /{sub(/^  - /,"");gsub(/"/,"");print;next} f{exit}' "$card")
  if ! git cat-file -e "${sha}^{commit}" 2>/dev/null; then
    stale+=("$card (owner: $owner) — verified_at '$sha' not found"); continue
  fi
  specs=(); for g in "${globs[@]}"; do specs+=(":(glob)$g"); done
  if ! git diff --quiet "$sha" HEAD -- "${specs[@]}"; then
    n=$(git diff --name-only "$sha" HEAD -- "${specs[@]}" | wc -l | tr -d ' ')
    stale+=("$card (owner: $owner) — $n file(s) changed since $sha")
  fi
done
if [ ${#stale[@]} -eq 0 ]; then
  [[ "${1:-}" == "--quiet-if-none" ]] || echo "All context cards are fresh."
  exit 0
fi
echo "Stale context cards (refresh via the owner + skill refresh-context):"
printf '  - %s\n' "${stale[@]}"
