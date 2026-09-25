# .ai — shared memory for agents (Claude Code + Codex)

```
.ai/
├── context/            # COMMITTED. Durable, per-domain "context cards". One owner each.
│   ├── _TEMPLATE.md
│   └── <domain>.md
├── backlog/            # COMMITTED. Backlog drafts before they become Linear issues (plan-backlog).
└── work/               # GITIGNORED. Per-task handoffs, one folder per ticket.
    └── PLA-123/
        ├── plan.md           # orchestrator: waves, agents, status
        ├── requirements.md   # spec-analyst
        ├── ui.md             # design-analyst
        ├── contracts.md      # contracts-owner (the delta for this ticket)
        ├── db.md             # data-steward
        ├── api.md / web.md   # engineers: what changed + open questions
        └── review.md         # quality-gate
```

## Context cards

- ≤ 150 lines. Facts an outsider needs, **not** a code dump: shapes, conventions, file paths, gotchas.
- Front matter: `owner`, `sources` (globs), `verified_at` (commit sha).
- `scripts/ai/stale-cards.sh` lists cards whose sources changed after `verified_at`.
  A stale card is refreshed by its owner (skill `refresh-context`) — never by a consumer.

## The NEEDS protocol (how agents "ask each other")

Subagents can't message each other, so a consumer ends its reply with:

```NEEDS
to: data-steward
ask: Does `appointments` need a tenant-scoped unique index on (professional_id, starts_at)?
why: api-engineer is writing the overbooking check in create-appointment.handler.ts
blocking: yes
```

The orchestrator sends the `ask` to the owner, writes the answer into `.ai/work/<ID>/`, and resumes the
consumer. If the answer is durable, the owner also updates its card, so the next agent never has to ask.

With agent teams enabled, teammates can send the same block directly to each other instead.
