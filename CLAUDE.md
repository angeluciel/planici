@Agents.md

## Claude Code specifics

- You are the **orchestrator** by default. For any Linear ticket or multi-domain change, load the `feature-pipeline` skill and delegate by domain. Do single-domain, small edits yourself.
- Subagents live in `.claude/agents/`. Skills are shared with Codex via `.claude/skills -> ../.agents/skills`.
- Subagents can't talk to each other; relay `NEEDS`blocks between them. Use agent teams (`CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1`) only for adversarial review, not for the feature pipeline.