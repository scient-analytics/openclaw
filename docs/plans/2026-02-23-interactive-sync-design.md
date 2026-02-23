# Interactive Sync — Design Document

## Problem

The current `/sync` command auto-generates a brief session summary and fires it to Michael. This loses critical context: what the goal was, which tools/skills were used, reusable patterns, and opportunities to formalize knowledge as shared skills or agents. Non-technical users (no git) get the same shallow treatment as developers.

## Solution

Rewrite `/sync` as an interactive interview that walks the user through a structured debrief, detects skill changes and reusable patterns, offers to export them, and sends a rich payload to Michael.

## Interview Flow

Five steps, asked one at a time:

### Step 1 — Goal & Context (always)

Claude reviews conversation history and proposes a draft goal. Asks user to confirm or correct:

> "It looks like this session was about [X]. Is that right, or would you describe it differently?"

### Step 2 — Tools & Skills Used (always)

Claude scans conversation for tool calls, skill invocations, libraries, techniques. Presents what it found:

> "I noticed you used [X, Y, Z]. Anything else worth noting?"

### Step 3 — Outcomes & Decisions (always)

> "What were the key outcomes? Decisions made, problems solved, things that didn't work?"

Claude proposes a draft from conversation context. User validates/adds.

### Step 4 — Skill Sync (conditional)

Three checks, all conversation-first (git as optional bonus):

1. **Modified skills** — Did the user edit any existing shared skill during this session? Claude detects from conversation history (files read/edited) and asks directly. If found: include full updated SKILL.md content in payload.

2. **New skills created** — Did the user create a new skill? Same detection approach. If found: ask "Want to share this with the team?" If yes: include full SKILL.md content.

3. **Reusable pattern detection** — Claude analyzes the session for repeated procedures, novel techniques, multi-step workflows. If detected: "I noticed you figured out [X]. This could be a skill — want me to draft it?" If yes: Claude drafts a SKILL.md following repo `skill-creator` conventions (frontmatter with name + description, concise markdown body), shows for approval.

Detection priority: conversation history > user answers > git diff (bonus, never required).

### Step 5 — Good Practice Nudges (conditional)

Based on session signals, Claude suggests actions:

| Session signal                 | Nudge                       |
| ------------------------------ | --------------------------- |
| Brainstormed but no design doc | Flag for design doc         |
| Built a multi-step workflow    | Draft as reusable skill     |
| Solved a hard problem          | Document the technique      |
| Discussed team coordination    | Track as project/initiative |
| Created something agent-like   | Flag as potential agent     |

Only relevant nudges shown. User accepts or declines each. Accepted items go into payload.

## Payload Structure

```
[Claude Code Sync] {name} completed a session:

## Goal
{what the user was trying to accomplish}

## Tools & Skills Used
{bullet list of tools, skills, techniques, libraries}

## Outcomes
{key results, decisions, problems solved, things that didn't work}

## Skills to Share
### New: {skill-name}
{full SKILL.md content}

### Updated: {skill-name}
{full updated SKILL.md content}

### Proposed: {pattern-name}
{draft SKILL.md for a detected reusable pattern}

## Good Practice Notes
{accepted nudges — e.g., "needs design doc", "workflow could be an agent"}

## Files Changed
{git diff --stat, if in a repo with changes}

## Open Questions
{unresolved items}
```

Empty sections are omitted.

## Michael's Role After Receiving

1. Store session summary in KB (Person doc + session log)
2. Store new/updated skills in KB for team-wide discovery
3. Cross-reference with other team members' sessions — spot overlaps, gaps
4. Proactively surface opportunities: "Matt built a PDF skill, Sarah could use this"
5. Track accepted good-practice nudges as action items

## What Doesn't Change

- `/ask-michael` command — unchanged
- Gateway endpoint and auth — same `POST /hooks/agent` with `deliver: false`
- JSON payload shape — same `{message, sessionKey, name, deliver}` envelope
- Environment variables — same `MICHAEL_URL`, `MICHAEL_TOKEN`, `MICHAEL_NAME`

## Key Principles

- Conversation history is the primary data source, not git
- Interview is conversational, not a form — Claude proposes, user validates
- Skill creation follows existing `skill-creator` repo conventions
- Works for any session type: coding, strategy, research, brainstorming
- Non-technical users get the same rich experience as developers
