# Claude Code ↔ Michael Sync — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a Claude Code skill with `/sync` and `/ask-michael` commands that let team members push session context to Michael and query his KB.

**Architecture:** Two markdown command files in `skills/sync-to-michael/`. Each uses `curl` to POST to Michael's `/hooks/agent` gateway endpoint. User configures env vars for URL, token, and name.

**Tech Stack:** Markdown (Claude Code command format), bash (`curl` for HTTP), env vars for config.

---

### Task 1: Create `/sync` command

**Files:**

- Create: `skills/sync-to-michael/sync.md`

**Step 1: Write the command file**

```markdown
---
description: Push session summary to Michael (team coordinator)
argument-hint: [highlights to share]
allowed-tools: Bash, Read, Glob, Grep
---

# Sync to Michael

Push a summary of this session to Michael, the team coordinator agent.

## Required Environment Variables

- `MICHAEL_URL` — OpenClaw gateway URL (e.g., `http://localhost:18789`)
- `MICHAEL_TOKEN` — Hooks auth token
- `MICHAEL_NAME` — Your display name (e.g., `Sarah`)

## Instructions

1. **Check config.** Verify all three env vars are set. If any is missing, tell the user which ones to set and stop.

2. **Gather context.** Collect the following:
   - Run `git diff --stat HEAD~5..HEAD 2>/dev/null` to see recent file changes (if in a git repo)
   - Run `git log --oneline -10 2>/dev/null` to see recent commits
   - Summarize what was done in this session based on the conversation history
   - If the user passed $ARGUMENTS, include those as highlights

3. **Build the payload.** Format a JSON message:
```

[Claude Code Sync] {MICHAEL_NAME} completed a session:

## Summary

{2-3 sentence summary of what was done}

## Achievements

{bullet list of concrete outputs: commits, features, fixes}

## Files Changed

{from git diff --stat}

## Patterns Worth Sharing

{any reusable solutions, techniques, or insights — omit section if none}

## Open Questions

{unresolved items — omit section if none}

````

4. **Send to Michael.** Run:
```bash
curl -s -X POST "$MICHAEL_URL/hooks/agent" \
  -H "Authorization: Bearer $MICHAEL_TOKEN" \
  -H "Content-Type: application/json" \
  -d @/tmp/michael-sync.json
````

Where `/tmp/michael-sync.json` contains:

```json
{
  "message": "<the formatted message>",
  "sessionKey": "person:<name_lowercase>",
  "name": "<MICHAEL_NAME>",
  "deliver": false
}
```

5. **Confirm.** Tell the user: "Synced to Michael. He'll update the KB on his next turn."

## Important

- Write the JSON payload to a temp file first to avoid shell escaping issues
- `deliver: false` means Michael uses tools (stores in Outline) instead of just replying
- Keep summaries concise — Michael is good at extracting structure from brief input
- The `sessionKey` must be `person:<lowercase_name>` to match Michael's session routing

````

**Step 2: Verify the file**

```bash
head -5 skills/sync-to-michael/sync.md
````

Expected: frontmatter with `description: Push session summary to Michael`

**Step 3: Commit**

```bash
git add skills/sync-to-michael/sync.md
git commit -m "feat(michael): add /sync command for Claude Code → Michael"
```

---

### Task 2: Create `/ask-michael` command

**Files:**

- Create: `skills/sync-to-michael/ask-michael.md`

**Step 1: Write the command file**

````markdown
---
description: Ask Michael a question about the team, projects, or KB
argument-hint: <your question>
allowed-tools: Bash
---

# Ask Michael

Ask Michael (team coordinator) a question. He'll search his knowledge base and respond.

## Required Environment Variables

- `MICHAEL_URL` — OpenClaw gateway URL (e.g., `http://localhost:18789`)
- `MICHAEL_TOKEN` — Hooks auth token
- `MICHAEL_NAME` — Your display name (e.g., `Sarah`)

## Instructions

1. **Check config.** Verify all three env vars are set. If any is missing, tell the user which ones to set and stop.

2. **Check question.** The user's question is in `$ARGUMENTS`. If empty, ask: "What do you want to ask Michael?"

3. **Send question.** Write the payload to a temp file and POST:

   ```bash
   cat > /tmp/michael-ask.json << ASKEOF
   {
     "message": "$ARGUMENTS",
     "sessionKey": "person:<name_lowercase>",
     "name": "<MICHAEL_NAME>",
     "deliver": true
   }
   ASKEOF

   curl -s -X POST "$MICHAEL_URL/hooks/agent" \
     -H "Authorization: Bearer $MICHAEL_TOKEN" \
     -H "Content-Type: application/json" \
     -d @/tmp/michael-ask.json
   ```
````

4. **Parse response.** The response JSON has a `reply` field (when `deliver: true`). Extract and display Michael's answer to the user.

5. **Display.** Show Michael's response clearly. If it references Outline docs, note that these are from his knowledge base.

## Important

- `deliver: true` means Michael's response is returned synchronously
- The question goes to Michael's session for this person — he has conversation history
- Keep questions specific for better answers

````

**Step 2: Verify the file**

```bash
head -5 skills/sync-to-michael/ask-michael.md
````

Expected: frontmatter with `description: Ask Michael a question`

**Step 3: Commit**

```bash
git add skills/sync-to-michael/ask-michael.md
git commit -m "feat(michael): add /ask-michael command for querying KB"
```

---

### Task 3: Test `/sync` locally

**Step 1: Set env vars**

```bash
export MICHAEL_URL="http://127.0.0.1:18789"
export MICHAEL_TOKEN="test-secret"
export MICHAEL_NAME="Matt"
```

**Step 2: Install the command**

```bash
ln -sf ~/code/openclaw/skills/sync-to-michael ~/.claude/commands/sync-to-michael
```

**Step 3: Verify commands appear**

In a Claude Code session, type `/sync` and `/ask-michael` — both should appear as available commands.

**Step 4: Run `/sync` and verify Michael received it**

Run `/sync Tested the sync-to-michael skill` in Claude Code. Then check:

```bash
# Check Michael's session for the incoming message
python3 -c "
import json
with open('$HOME/.openclaw/agents/michael/sessions/sessions.json') as f:
    data = json.load(f)
matt = data.get('agent:michael:person:matt', {})
print('Session:', matt.get('sessionId', 'none'))
"
```

Expected: Michael has a session for `person:matt` with the sync message.

**Step 5: Run `/ask-michael what do you know about the team?`**

Expected: Michael responds with team info from his Outline KB.

**Step 6: Commit test results (if any fixes needed)**

```bash
git add -A
git commit -m "fix(michael): adjust sync skill based on testing"
```
