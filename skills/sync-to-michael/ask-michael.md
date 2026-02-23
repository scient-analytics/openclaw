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

3. **Send question.** Build the JSON payload safely using python:

   ```bash
   python3 -c "
   import json, os
   name = os.environ['MICHAEL_NAME']
   payload = {
       'message': '''$ARGUMENTS''',
       'sessionKey': f'person:{name.lower()}',
       'name': name,
       'deliver': True
   }
   with open('/tmp/michael-ask.json', 'w') as f:
       json.dump(payload, f)
   "

   curl -s -X POST "$MICHAEL_URL/hooks/agent" \
     -H "Authorization: Bearer $MICHAEL_TOKEN" \
     -H "Content-Type: application/json" \
     -d @/tmp/michael-ask.json
   ```

4. **Parse response.** The response JSON contains Michael's reply. Extract the `reply` field and display it to the user.

5. **Display.** Show Michael's response clearly. If he references docs or people, note these come from his knowledge base.

## Important

- `deliver: true` means Michael's response is returned synchronously in the HTTP response
- The question goes into Michael's session for this person — he has full conversation history
- Keep questions specific for better answers
