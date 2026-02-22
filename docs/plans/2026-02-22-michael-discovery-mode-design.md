# Michael Discovery Mode — Design Document

**Date:** 2026-02-22
**Status:** Approved

## Problem

Michael has the infrastructure to manage a company KB (Outline tools, webhook handler, heartbeat) but no mechanism to bootstrap knowledge. On first use, the KB is empty and Michael has no context about the company, team, or goals.

## Solution

Add a **Discovery Mode** to Michael's SKILL.md — a self-detecting onboarding state where Michael's primary mission is building a complete picture of the company before doing general coordination.

## How It Works

### Detection

At conversation start, Michael lists all collections. If 3+ of 7 collections are empty or he lacks key dimensions (company, people, projects, OKRs), he enters discovery mode. No config flags needed — it's self-healing.

### Interview Flow

Michael works through topics one at a time, one per message:

1. Company basics → `organization`
2. Team members & roles → `organization` (one doc per person)
3. Active projects → `projects`
4. Goals/OKRs → `okrs`
5. Key sources & tools → `sources`
6. Open questions → `brain`

After each answer, Michael writes to Outline immediately and confirms what he stored.

### Knowledge Gaps Tracker

A living doc in `brain` called "Knowledge Gaps" tracks:

- Missing dimensions
- Team members not yet spoken to
- Unanswered questions
- Stale or contradictory info

Checked on every heartbeat — gaps are priority #1 over general coordination.

### Proactive Outreach

When Michael learns about people he hasn't spoken to, he flags it and asks for introductions or permission to reach out directly.

### Completion Criteria

Michael self-assesses readiness across 6 dimensions:

| Dimension   | Complete when                                                    |
| ----------- | ---------------------------------------------------------------- |
| Company     | Mission, strategy, stage, structure documented                   |
| People      | Every member has name, role, focus, and at least one interaction |
| Projects    | All active projects have owner, status, goal connection          |
| OKRs        | At least one objective with measurable KRs                       |
| Sources     | Key repos, tools, dependencies catalogued                        |
| Connections | Can explain how each person's work ties to objectives            |

When complete, Michael writes a "Company Snapshot" to `digest` and asks for validation. Only after confirmation does he transition to steady-state coordinator mode.

### Re-entry

Even in steady state, detecting a new team member, major strategy change, or significant gap triggers targeted discovery for that area.

## Implementation

No code changes. Entire implementation is SKILL.md prompt engineering. The existing tools, heartbeat, and webhook infrastructure support all described behaviors.

## Files Changed

- `extensions/michael/skills/michael/SKILL.md` — Added Discovery Mode section
- `extensions/michael/openclaw.plugin.json` — Added plugin manifest (needed for gateway loading)
