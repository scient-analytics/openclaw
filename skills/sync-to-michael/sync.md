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

2. **Gather context.** Review the conversation history from this session and extract:
   - What was discussed or worked on
   - Key decisions made
   - Concrete outputs (if any: documents, strategies, analyses, code, fixes)
   - Insights or patterns that could help others on the team
   - Open questions or unresolved items
   - If the user passed $ARGUMENTS, include those as highlights

   Optionally, if in a git repo, also run:
   - `git diff --stat HEAD~5..HEAD 2>/dev/null` for recent file changes
   - `git log --oneline -5 2>/dev/null` for recent commits

3. **Build the payload.** Format the message using only the sections that apply — omit empty sections:

   ```
   [Claude Code Sync] {MICHAEL_NAME} completed a session:

   ## Summary
   {2-3 sentence summary of what was discussed or done}

   ## Key Outcomes
   {bullet list of decisions, deliverables, or conclusions}

   ## Files Changed
   {from git — omit this entire section if not in a git repo or no changes}

   ## Insights Worth Sharing
   {reusable knowledge, patterns, or approaches that could help the team — omit if none}

   ## Open Questions
   {unresolved items, things to follow up on — omit if none}
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
- This works for ANY kind of session — coding, strategy discussions, research, brainstorming
