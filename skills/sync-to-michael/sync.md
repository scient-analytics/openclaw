---
description: Sync session to Michael (team coordinator) — interactive debrief with skill export
argument-hint: [highlights to share]
allowed-tools: Bash, Read, Glob, Grep
---

# Sync to Michael

Interactive session debrief. Walk the user through a structured interview, detect reusable patterns and skill changes, then send a rich summary to Michael.

## Required Environment Variables

- `MICHAEL_URL` — OpenClaw gateway URL (e.g., `http://localhost:18789`)
- `MICHAEL_TOKEN` — Hooks auth token
- `MICHAEL_NAME` — Your display name (e.g., `Sarah`)

## Instructions

### 0. Check config

Verify all three env vars are set. If any is missing, tell the user which ones to set and stop.

### 1. Goal & Context

Review the conversation history and propose a draft goal:

> "It looks like this session was about [X]. Is that right, or would you describe it differently?"

Wait for the user to confirm or correct. If they passed $ARGUMENTS, incorporate those as highlights.

### 2. Tools & Skills Used

Scan the conversation for tool calls, skill invocations, libraries, and techniques. Present what you found:

> "I noticed you used [X, Y, Z]. Anything else worth noting?"

Wait for the user to validate or add.

### 3. Outcomes & Decisions

Propose a draft list of outcomes from the conversation:

> "Here's what I think the key outcomes were: [list]. Anything to add or change?"

Include: decisions made, problems solved, deliverables produced, things that didn't work.

### 4. Skill Sync

Run three checks. For each, **conversation history is the primary source** — git is optional bonus context.

**4a. Modified skills.** Did the user edit any existing skill files (SKILL.md or skill resources) during this session? Check conversation history for file edits. Also ask:

> "Did you update any existing skills during this session?"

If yes: read the current content of each modified skill file and include it in the payload under `Skills to Share > Updated`.

**4b. New skills created.** Did the user create a new skill during this session? Check conversation for skill-creator activity or new SKILL.md files. Ask:

> "Did you create any new skills? Want to share them with the team?"

If yes: read the skill content and include under `Skills to Share > New`.

**4c. Reusable pattern detection.** Analyze the session for reusable patterns: repeated procedures, novel techniques, multi-step workflows, non-obvious tool combinations. If you detect something:

> "I noticed you figured out [X]. This could be a useful skill for the team — want me to draft it?"

If yes: draft a SKILL.md following these conventions:

- YAML frontmatter with `name` and `description` (description should explain what it does AND when to use it)
- Concise markdown body with procedural instructions
- Keep it under 100 lines
- Show the draft to the user for approval before including

Include approved drafts under `Skills to Share > Proposed`.

If nothing detected in any of 4a/4b/4c, skip this section entirely — don't ask unnecessary questions.

### 5. Good Practice Nudges

Based on the session, suggest relevant actions. Only show nudges that actually apply — do not show the full list:

- Brainstormed but no design doc → "You explored an idea but didn't create a design doc — want to flag this for Michael?"
- Built a multi-step workflow → "This workflow could become a reusable skill — want me to draft it?" (triggers 4c if not already done)
- Solved a hard problem → "This approach is worth documenting — want to share the technique?"
- Discussed team coordination → "Should Michael track this as a project or initiative?"
- Created something agent-like → "This could become a dedicated agent — want to flag it for the team?"

User accepts or declines each. If no nudges apply, skip this step entirely.

### 6. Build the payload

Format the message using only sections that have content — omit empty sections:

```
[Claude Code Sync] {MICHAEL_NAME} completed a session:

## Goal
{confirmed goal from step 1}

## Tools & Skills Used
{bullet list from step 2}

## Outcomes
{confirmed outcomes from step 3}

## Skills to Share
### New: {skill-name}
{full SKILL.md content}

### Updated: {skill-name}
{full updated SKILL.md content}

### Proposed: {pattern-name}
{draft SKILL.md content}

## Good Practice Notes
{accepted nudges from step 5}

## Files Changed
{git diff --stat HEAD~5..HEAD — omit if not in a git repo or no changes}

## Open Questions
{unresolved items from the session — omit if none}
```

### 7. Send to Michael

Write the JSON payload to `/tmp/michael-sync.json` using python (safe JSON construction), then POST:

```python
python3 -c "
import json, os
name = os.environ['MICHAEL_NAME']
message = '''<the formatted message>'''
payload = {
    'message': message,
    'sessionKey': f'person:{name.lower()}',
    'name': name,
    'deliver': False
}
with open('/tmp/michael-sync.json', 'w') as f:
    json.dump(payload, f)
"
```

```bash
curl -s -X POST "$MICHAEL_URL/hooks/agent" \
  -H "Authorization: Bearer $MICHAEL_TOKEN" \
  -H "Content-Type: application/json" \
  -d @/tmp/michael-sync.json
```

### 8. Confirm

Tell the user: "Synced to Michael. He'll update the KB on his next turn."

If skills were shared, also note: "Shared [N] skill(s) — Michael will store them for team-wide access."

## Important

- `deliver: false` means Michael uses tools (stores in Outline) instead of just replying
- The interview should feel conversational, not like a form — propose drafts, let the user correct
- Conversation history is the primary data source, not git
- Skill drafts follow the repo's skill-creator conventions: frontmatter (name + description) + concise markdown body
- The `sessionKey` must be `person:<lowercase_name>` to match Michael's session routing
- This works for ANY session type: coding, strategy, research, brainstorming
- Non-technical users get the same rich experience as developers
