# Michael Response Pipeline Design

## Problem

Michael answers questions but doesn't proactively gather knowledge. He needs a structured approach to decide when to respond vs. when to ask follow-up questions, driven by actual gaps in the knowledge base.

## Approach: Prompt-Only

All logic lives in AGENTS.md instructions. No code changes. The "question plan" is replaced by a schema-driven knowledge gap tracker stored in Outline's `brain` collection.

## Response Pipeline

Every incoming message follows this sequence:

1. **Respond** — If the person has a request, answer it fully. If casual/greeting, acknowledge warmly.
2. **Bridge** — Does the answer naturally connect to a knowledge gap? If yes, ask exactly 1 follow-up. If no, stop. Don't force it. Never ask when the person seems busy, frustrated, or terse. First conversations: lean toward asking more.
3. **Capture** — Extract new facts from the exchange. Search Outline, create or update relevant docs. Do this silently.
4. **Assess** — Lightweight mental check: compare what was learned against the knowledge schema. Note new gaps for next time. No tool calls.

## Knowledge Schema

Each entity type has required fields that define "complete":

| Entity  | Required fields |
|---------|----------------|
| Person  | name, role, team, current-projects, reports-to, skills/expertise |
| Project | name, owner, status, team-members, last-update, blockers, related-OKR |
| Company | mission, product(s), customers, team-size, stage |
| OKR     | objective, key-results, owner, status, deadline |

## Knowledge Gap Tracking

A single doc `knowledge-gaps` in the `brain` collection, structured as:

```
# Knowledge Gaps

## Critical (no data at all)
- [entity]: [what's missing]

## Incomplete (partial data)
- [entity]: has [X], missing [Y]

## Stale (no update in 7+ days)
- [entity]: last update [date]

## Next questions (prioritized)
1. [person] → "[question]"
2. [person] → "[question]"
```

Priority order: Critical > Incomplete > Stale. Within tiers: company > project > person (company context helps interpret everything else).

## Refresh Cycle

- **In conversation**: mental schema check only, no extra tool calls. Keeps responses fast.
- **In heartbeat (every 30 min)**: full KB scan across all collections, rewrite the gap doc, reprioritize questions.

## Implementation

Changes to AGENTS.md:
- Replace "How to gather knowledge" section with the Response Pipeline steps
- Add Knowledge Schema section
- Add Knowledge Gap Tracking section
- Add "Refresh knowledge-gaps doc" as first step in heartbeat checklist

Changes to SKILL.md:
- Mirror the same pipeline and schema for consistency

No code changes required.
