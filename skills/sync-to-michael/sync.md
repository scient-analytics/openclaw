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

3. **Build the payload.** Format the message as:

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
   ```

4. **Send to Michael.** Write the JSON payload to `/tmp/michael-sync.json` first (avoids shell escaping issues), then POST:

   ```bash
   curl -s -X POST "$MICHAEL_URL/hooks/agent" \
     -H "Authorization: Bearer $MICHAEL_TOKEN" \
     -H "Content-Type: application/json" \
     -d @/tmp/michael-sync.json
   ```

   The JSON payload must be:

   ```json
   {
     "message": "<the formatted message>",
     "sessionKey": "person:<name_lowercase>",
     "name": "<MICHAEL_NAME>",
     "deliver": false
   }
   ```

   Use python or jq to build the JSON safely — do not hand-construct it with string concatenation.

5. **Confirm.** Tell the user: "Synced to Michael. He'll update the KB on his next turn."

## Important

- `deliver: false` means Michael uses tools (stores in Outline) instead of just replying with text
- Keep summaries concise — Michael is good at extracting structure from brief input
- The `sessionKey` must be `person:<lowercase_name>` to match Michael's session routing
