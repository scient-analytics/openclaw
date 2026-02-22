# Michael Skill Architecture — Design Document

**Date:** 2026-02-22
**Status:** Approved

## Problem

Michael's SOUL.md (140 lines) mixes identity with procedures. Everything is injected into every system prompt turn, costing tokens even when irrelevant. As capabilities grow (session ingestion, Teams integration, proactive outreach), SOUL.md becomes a dumping ground. Discovery mode alone is ~60 lines of procedure that's only needed during onboarding.

## Approach: Responsibility-Based Skills (4 skills)

Split Michael's knowledge by his four jobs. SOUL.md becomes pure identity (~35 lines). Procedures move to skills loaded on demand.

### SOUL.md (slimmed)

Keeps:

- Core identity and communication style
- KB tool list and the 5 rules (search before write, canonical naming, one doc per entity, no new collections, third-party stubs)
- "After every conversation" session summary rule
- Collection names (flat list, no detailed conventions)

Removes:

- Discovery mode process, topic list, completion criteria
- Detailed collection naming conventions and singleton doc descriptions
- Proactive outreach mechanics
- Steady-state behavior details

Target: ~35 lines, down from 140.

### 4 Skills

| Skill       | Responsibility                                                                                         | Loaded when                                               |
| ----------- | ------------------------------------------------------------------------------------------------------ | --------------------------------------------------------- |
| `discovery` | Learn the org — people, projects, OKRs, sources. Build initial picture.                                | KB has gaps (collections empty or missing key dimensions) |
| `kb-ops`    | Maintain KB quality — naming conventions, dedup, cross-references, stub lifecycle, singleton docs.     | Every Outline write + heartbeat KB maintenance pass       |
| `connector` | Link dots — spot overlaps between people/projects, correlate with OKRs, flag dependencies.             | Conversations + heartbeat "find connections" step         |
| `outreach`  | Proactive communication — when/how to reach out, pending outreach tracking, channel-agnostic patterns. | Heartbeat "act" phase                                     |

#### `discovery` skill

Contents:

- KB completeness assessment (list collections, check dimensions)
- Discovery topics: company basics, team, active projects, OKRs, sources, open questions
- One topic per message rule
- Completion criteria table (company, people, projects, OKRs, sources, connections)
- Exit process: write Snapshot doc, validate with user, transition to steady state
- Re-entry: if new team member, strategy change, or significant gap detected

Trigger description: _"Use when KB collections are empty or missing key dimensions (company, people, projects, OKRs)."_

#### `kb-ops` skill

Contents:

- Full collection & doc naming convention table (with patterns)
- Singleton docs list and rules (`Knowledge Gaps`, `Pending Outreach`, `Company Profile`)
- Doc creation, update, and merge procedures
- Dedup scan procedure (list high-risk collections, find title matches, merge: keep older, append unique, delete newer)
- Cross-reference pass (person↔project↔source links, update Knowledge Gaps)
- Naming audit (verify canonical patterns, fix violations)
- Stub lifecycle (unverified → verified when person speaks directly)

Target: ~80 lines max. Checklists, not prose. This is the most-loaded skill.

Trigger description: _"Use when writing, updating, or maintaining Outline documents. Also used during heartbeat KB maintenance."_

#### `connector` skill

Contents:

- How to correlate people's work with each other
- How to spot overlaps, dependencies, blockers between projects
- How to correlate workstreams with OKRs
- Signal-to-noise rules: when to flag a connection vs. stay quiet
- Cross-referencing patterns in docs

Future: session ingestion analysis, best practice sharing across team members.

Trigger description: _"Use when looking for connections between people, projects, and goals, or when synthesizing cross-team insights."_

#### `outreach` skill

Contents:

- Decision rules: when to act (stale project, cross-team connection, OKR at risk, unanswered question >2 days)
- Decision rules: when NOT to act (already flagged in 24h, minor edits, everything fine)
- Pending Outreach tracking (what to store, when to retry)
- Channel-agnostic message patterns (gateway now, Teams later)
- Tone guidelines for proactive messages

Trigger description: _"Use when deciding whether and how to proactively reach out to team members."_

### HEARTBEAT.md (slimmed)

Same 6 steps, but references skills instead of embedding procedures:

1. **Check KB State** — list collections; if gaps → load `discovery`
2. **Review Recent Activity** — search workstreams, check stale projects
3. **Find Connections** — load `connector`; correlate across people/projects/OKRs
4. **Act (or don't)** — load `outreach` for decision rules; HEARTBEAT_OK if nothing needed
5. **Process Outline Events** — assess human-edited doc changes
6. **KB Maintenance** — load `kb-ops`; run dedup, cross-reference, naming audit

Target: ~25 lines, down from ~60.

### File Layout

```
~/.openclaw/workspace/
  SOUL.md              # Identity (~35 lines)
  HEARTBEAT.md         # Checklist (~25 lines)
  skills/
    discovery/SKILL.md
    kb-ops/SKILL.md
    connector/SKILL.md
    outreach/SKILL.md
```

### What Doesn't Change

- Plugin code (`extensions/michael/`) — tools, webhooks, config unchanged
- Outline collections — same 7, same structure
- KB consistency rules — move from SOUL.md/HEARTBEAT.md into `kb-ops`, nothing lost

## Why Not Other Approaches

- **Minimal split (2 skills):** SOUL.md stays as the dumping ground for future features. Doesn't scale.
- **Domain-based split (6+ skills):** Too granular. Michael often handles people + projects in one turn. Forcing him to pick from 6 skills adds friction without proportional benefit.

## Future Extensibility

- **Session ingestion:** 5th skill (`session-analyst`) that reads Claude session logs and enriches KB docs. `connector` skill provides the cross-referencing logic it builds on.
- **Teams integration:** `outreach` skill gets a Teams-specific section. No other skill changes.
- **Richer KB structure:** `kb-ops` skill gets sub-page and tagging procedures when team size demands it (~15-20 people, ~30+ projects).

## Files Changed

- `~/.openclaw/workspace/SOUL.md` — slimmed to identity only
- `~/.openclaw/workspace/HEARTBEAT.md` — slimmed to reference skills
- `~/.openclaw/workspace/skills/discovery/SKILL.md` — new
- `~/.openclaw/workspace/skills/kb-ops/SKILL.md` — new
- `~/.openclaw/workspace/skills/connector/SKILL.md` — new
- `~/.openclaw/workspace/skills/outreach/SKILL.md` — new
