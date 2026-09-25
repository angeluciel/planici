#!/usr/bin/env node
// Generates .codex/agents/*.toml from .claude/agents/*.md so both tools share one definition.
// Run after editing any Claude agent: node scripts/ai/sync-codex/agents.mjs
import { mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const SRC = ".claude/agents";
const OUT = ".codex/agents";
const SKIP = new Set(["orchestrator"]); // in Codex the main session is the orchestrator (see AGENTS.md)
const EFFORT = { opus: "high", sonnet: "medium", haiku: "low", inherit: "medium" };
const MCP = {
	linear: 'url = "https://mcp.linear.app/mcp"',
	figma: 'url = "https://mcp.figma.com/mcp"',
	onarqube:
		'command = "docker"\nargs = ["run", "-i", "--rm", "-e", "SONARQUBE_TOKEN", "-e", "SONARQUBE_ORG", "mcp/sonarqube"]\nenv_vars = ["SONARQUBE_TOKEN", "SONARQUBE_ORG"]',
	postgres:
		'command = "sh"\nargs = ["-c", "npx -y @modelcontextprotocol/server-postgres \\"$DATABASE_URL_READONLY\\""]\nenv_vars = ["DATABASE_URL_READONLY"]',
};

const tomlStr = (s) => JSON.stringify(s);
const tomlBlock = (s) => `"""\n${s.replaceAll('"""', '\\"\\"\\').trim()}\n"""`;

function parse(md) {
	const m = md.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
	if (!m) throw new Error("missing front matter");
	const fm = {};
	let listKey = null;
	for (const line of m[1].split("\n")) {
		const item = line.match(/^\s+-\s+(.*)$/);
		if (item && listKey) {
			fm[listKey].push(item[1].trim());
			continue;
		}
		const kv = line.match(/^(\w+):\s*(.*)$/);
		if (!kv) continue;
		listKey = kv[2] === "" ? kv[1] : null;
		fm[kv[1]] = kv[2] === "" ? [] : kv[2];
	}
	return { fm, body: m[2] };
}

mkdirSync(OUT, { recursive: true });
for (const file of readdirSync(SRC).filter((f) => f.endsWith(".md"))) {
	const { fm, body } = parse(readFileSync(join(SRC, file), "utf8"));
	if (SKIP.has(fm.name)) continue;
	const tools = String(fm.tools ?? "");
	const servers = [...tools.matchAll(/mcp__(\w+)/g)].map((m) => m[1]);
	const skills = Array.isArray(fm.skills) ? fm.skills : [];
	const preface = [
		`You are the ${fm.name} agent. Allowed tools in the Claude version: ${tools}. Stay within them.`,
		skills.length ? `Before starting, read these skills in .agents/skills/: ${skills.join(", ")}.` : "",
	]
		.filter(Boolean)
		.join("\n");

	let toml = `# GENERATED from ${SRC}/${file} by scripts/ai/sync-codex-agents.mjs — edit the source, not this file.\n`;
	toml += `name = ${tomlStr(fm.name)}\n`;
	toml += `description = ${tomlStr(fm.description)}\n`;
	toml += `model_reasoning_effort = ${tomlStr(EFFORT[fm.model] ?? "medium")}\n`;
	toml += `sandbox_mode = "workspace-write"\n`;
	toml += `developer_instructions = ${tomlBlock(`${preface}\n\n${body}`)}\n`;
	for (const s of servers) if (MCP[s]) toml += `\n[mcp_servers.${s}]\n${MCP[s]}\n`;
	writeFileSync(join(OUT, file.replace(/\.md$/, ".toml")), toml);
	console.log(`✓ ${OUT}/${file.replace(/\.md$/, ".toml")}`);
}
