---
name: refresh-context
description: Rebuild or update a domain context card in .ai/context after its sources changed. Use when stale-cards.sh lists a card you own, or after you change files in your domain.
---
# Refresh a context card

1. `git diff <verified_at>..HEAD --stat -- <sources globs>` to see what changed. First build: read the sources.
2. Update only affected sections. Keep ≤ 150 lines; tables > prose; paths > explanations.
3. Include: key files, conventions, current shapes (tables / endpoints / schemas / routes), gotchas.
   Exclude: code bodies, anything obvious from a file name, history.
4. Set `verified_at` to `git rev-parse --short HEAD`.
5. Return a 3-line diff summary so the orchestrator knows if consumers must re-read.
