# Claude Code ↔ Michael Sync — Design Document

**Date:** 2026-02-22
**Status:** Approved

## Problem

Team members use Claude Code daily for coding, debugging, and research. The insights, achievements, and patterns from these sessions are trapped in individual CLI histories. Michael — the team coordinator agent — has no visibility into what people are building unless they tell him directly via chat.

## Goals

1. Team members can push session summaries, achievements, and patterns to Michael from Claude Code
2. Team members can query Michael's KB from Claude Code (ask questions, get context)
3. Auto-push available but not mandatory — users control what they share
4. Shared token auth (sufficient for 5-person team)

## Approach: Claude Code Skill + Gateway POST

Build a Claude Code skill (`sync-to-michael`) that talks to Michael via the existing `/hooks/agent` gateway endpoint. No new server-side code needed.

### Two Commands

**`/sync`** — Push session context to Michael

- Summarizes current session: what was done, files changed, achievements, open questions
- Optionally prompts user for highlights ("Anything to share?")
- POSTs to `/hooks/agent` with `deliver: false` (store only, no reply needed)
- Michael ingests as a workstream entry, updates person/project docs, runs connector

**`/ask-michael`** — Query Michael's KB

- User asks a question: `/ask-michael what's the status of the Binance pipeline?`
- POSTs to `/hooks/agent` with `deliver: true` (synchronous response)
- Returns Michael's answer inline in the Claude Code session

### Payload Format

```json
{
  "message": "[Claude Code Sync] {name} completed a session:\n\n## Summary\n{summary}\n\n## Achievements\n{achievements}\n\n## Files Changed\n{files}\n\n## Patterns Worth Sharing\n{patterns}\n\n## Open Questions\n{questions}",
  "sessionKey": "person:{name_lowercase}",
  "name": "{Name}",
  "deliver": false
}
```

For `/ask-michael`:

```json
{
  "message": "{question}",
  "sessionKey": "person:{name_lowercase}",
  "name": "{Name}",
  "deliver": true
}
```

### Auth

Single shared token — same `hooks.token` already in OpenClaw config. Each user sets env vars:

| Env Var         | Purpose              | Example                  |
| --------------- | -------------------- | ------------------------ |
| `MICHAEL_URL`   | OpenClaw gateway URL | `http://localhost:18789` |
| `MICHAEL_TOKEN` | Shared hooks token   | `test-secret`            |
| `MICHAEL_NAME`  | User's display name  | `Sarah`                  |

Sufficient for a 5-person team. Upgrade path: Tailscale auth (already supported by OpenClaw gateway) when team grows or gateway is network-exposed.

### Data Gathering

The `/sync` skill gathers context from:

1. **Git state** — `git diff --stat` and `git log --oneline` for recent commits in the session
2. **Session context** — Claude Code's conversation history (what was discussed, decisions made)
3. **User input** — optional prompt: "Anything to highlight?" (can skip with `/sync --auto`)

### What Michael Does With It

No new Michael code. His existing behavior handles it:

1. Receives message in the user's session (`sessionKey: "person:sarah"`)
2. SOUL.md rules: search before write, store immediately
3. Creates/updates `Session: {date} {person}` in workstreams
4. Updates `Person: {Name}` with latest focus
5. Updates relevant `Project: {Name}` docs
6. `connector` skill finds cross-team links on next heartbeat

The `[Claude Code Sync]` prefix helps Michael distinguish automated syncs from direct conversation — more factual ingestion, less conversational back-and-forth.

### Skill Distribution

Skill lives at `skills/sync-to-michael/SKILL.md` in the OpenClaw repo. Team members install via:

```bash
# Symlink into Claude Code commands
ln -s ~/code/openclaw/skills/sync-to-michael ~/.claude/commands/sync-to-michael
```

Or copy the SKILL.md into `~/.claude/commands/`.

### File Layout

```
skills/sync-to-michael/
  SKILL.md          # Skill instructions for Claude Code
```

## What Doesn't Change

- OpenClaw gateway — no changes, `/hooks/agent` already supports this
- Michael plugin — no code changes
- Michael's SOUL.md / skills — no changes (already handles incoming messages)
- Hooks config — already has `enabled: true`, `allowRequestSessionKey: true`

## Future: MCP Server (Not Built Now)

POST-based sync works but has a limitation: users must explicitly ask. An MCP server would give Claude Code **native tools** for Michael's KB:

| Tool             | Purpose                     |
| ---------------- | --------------------------- |
| `michael_search` | Search Michael's Outline KB |
| `michael_read`   | Read a specific KB doc      |
| `michael_sync`   | Push session summary        |
| `michael_ask`    | Ask Michael a question      |

With MCP, Claude Code could **automatically** search Michael's KB when relevant — e.g., discovering Thomas already solved a similar problem — without the user explicitly asking.

**Upgrade path:** The POST payload format designed here transfers directly to MCP tool schemas. Build POST-based skill now, validate the flow, upgrade to MCP when bidirectional feels necessary.

## Files Changed

- `skills/sync-to-michael/SKILL.md` — new Claude Code skill
